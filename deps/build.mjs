// Builds every package in deps/package.json `dependencies` as self-contained
// browser ESM into ../build/deps/, replicating the esm.sh layout:
//
//   build/deps/
//     react@19.2.8/index.mjs            versioned, immutable — what the
//     react@19.2.8/jsx-runtime.mjs      import map points at
//     react-dom@19.2.8/client.mjs
//     zustand@5.0.14/react/shallow.mjs
//     react                             esm.sh-style unversioned stub:
//                                       re-exports the current versioned build
//     _headers                          Cloudflare Pages: content-type for the
//                                       extensionless stubs + immutable caching
//     import-map.deps.json              generated import-map fragment
//
// and generates deps/generated/deps-imports.ts — the third-party section of
// the runtime manifest, derived from the exact same build. package.json is
// the single version source of truth: bump a dependency there, `npm install
// && npm run build`, and the built modules, the CDN layout, and the manifest
// entries all move together.
//
// Cross-package imports are NOT bundled: every other package in
// `dependencies` is externalized as its bare specifier, which the site's
// import map resolves. That is what guarantees one React (one Zustand, …)
// per page — the import map, not esm.sh's ?deps= URL threading.

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));
const outRoot = path.resolve(here, "../build/deps");
const require = createRequire(import.meta.url);

const CDN_ORIGIN = "https://deps.ferry.rsvp";

const pkgJson = JSON.parse(await readFile(path.join(here, "package.json"), "utf8"));
const entrypoints = JSON.parse(await readFile(path.join(here, "entrypoints.json"), "utf8"));
delete entrypoints["//"];

const packages = Object.keys(pkgJson.dependencies);
for (const pkg of Object.keys(entrypoints)) {
  if (!packages.includes(pkg)) {
    throw new Error(`entrypoints.json lists "${pkg}" which is not in package.json dependencies`);
  }
}

/**
 * Enumerate the runtime export names of an entrypoint by importing it in
 * node (cjs-module-lexer gives named exports for CJS packages the same way
 * esm.sh's export scanner does). Used to generate an explicit re-export
 * shim per entrypoint: rollup's commonjs interop only wires up named
 * exports that something statically asks for, so building the bare CJS
 * module directly yields a default-only ESM file. The shim asks for every
 * name. For real ESM packages the shim is a plain re-export and changes
 * nothing.
 */
async function exportNamesOf(spec) {
  const ns = await import(spec);
  const names = Object.keys(ns).filter((k) => k !== "default");
  return { names, hasDefault: "default" in ns };
}

const isIdent = (s) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s);

async function writeShim(pkg, sub) {
  const spec = specifier(pkg, sub);
  const { names, hasDefault } = await exportNamesOf(spec);
  const exportable = names.filter(isIdent);
  const skipped = names.filter((n) => !isIdent(n));
  if (skipped.length) {
    console.warn(`  warn ${spec}: skipping non-identifier exports: ${skipped.join(", ")}`);
  }
  const lines = [
    `// generated shim for ${spec} — forces explicit named re-exports`,
    ...(exportable.length
      ? [`export { ${exportable.join(", ")} } from ${JSON.stringify(spec)};`]
      : [`export * from ${JSON.stringify(spec)};`]),
    ...(hasDefault ? [`export { default } from ${JSON.stringify(spec)};`] : []),
    "",
  ];
  const shimPath = path.join(here, ".shims", pkg, `${entryName(sub)}.mjs`);
  await mkdir(path.dirname(shimPath), { recursive: true });
  await writeFile(shimPath, lines.join("\n"));
  return shimPath;
}

/** "" -> "index", "react/shallow" -> "react/shallow" (nested output file). */
const entryName = (sub) => (sub === "" ? "index" : sub);
const specifier = (pkg, sub) => (sub === "" ? pkg : `${pkg}/${sub}`);

/** External everything that is another CDN package (or a subpath of one). */
function makeExternal(selfPkg) {
  const others = packages.filter((p) => p !== selfPkg);
  return (id) => others.some((p) => id === p || id.startsWith(`${p}/`));
}

await rm(outRoot, { recursive: true, force: true });
await rm(path.join(here, ".shims"), { recursive: true, force: true });
await mkdir(outRoot, { recursive: true });

const generated = {}; // bare specifier -> CDN URL
const versions = {}; // pkg -> exact installed version

for (const pkg of packages) {
  const version = JSON.parse(
    await readFile(require.resolve(`${pkg}/package.json`), "utf8"),
  ).version;
  versions[pkg] = version;
  const subs = entrypoints[pkg] ?? [""];
  const outDir = path.join(outRoot, `${pkg}@${version}`);

  const input = Object.fromEntries(
    await Promise.all(
      subs.map(async (sub) => [entryName(sub), await writeShim(pkg, sub)]),
    ),
  );

  await build({
    configFile: false,
    root: here,
    logLevel: "warn",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: {
      outDir,
      emptyOutDir: true,
      copyPublicDir: false,
      modulePreload: false,
      target: "es2022",
      minify: true,
      rollupOptions: {
        input,
        external: makeExternal(pkg),
        // Each entry must re-export its package's exact public surface.
        // Without this, vite's app-build default tree-shakes "unused"
        // exports and pure-ESM packages (zod, zustand) collapse to
        // empty files.
        preserveEntrySignatures: "strict",
        output: {
          format: "es",
          entryFileNames: "[name].mjs",
          chunkFileNames: "chunks/[name]-[hash].mjs",
          minifyInternalExports: false,
        },
        // React and friends are published CJS-only; vite's build-time
        // commonjs pass converts them. Packages with real ESM (zod,
        // zustand) pass through untouched.
      },
    },
  });

  for (const sub of subs) {
    generated[specifier(pkg, sub)] =
      `${CDN_ORIGIN}/${pkg}@${version}/${entryName(sub)}.mjs`;
  }

  // esm.sh-style unversioned stub for the package root: GET /react resolves
  // to the current pinned build. Convenience/debug surface only — the import
  // map always points at the versioned, immutable URL.
  const rootFile = `${pkg}@${version}/index.mjs`;
  const rootSource = await readFile(path.join(outRoot, rootFile), "utf8");
  const hasDefault = /\bas default\b|export default/.test(rootSource);
  const stub =
    `/* deps.ferry.rsvp - ${pkg}@${version} */\n` +
    `export * from "/${rootFile}";\n` +
    (hasDefault ? `export { default } from "/${rootFile}";\n` : "");
  const stubPath = path.join(outRoot, pkg);
  await mkdir(path.dirname(stubPath), { recursive: true });
  await writeFile(stubPath, stub);
}

// ---- Generated outputs -----------------------------------------------------

await writeFile(
  path.join(outRoot, "import-map.deps.json"),
  JSON.stringify({ imports: generated }, null, 2) + "\n",
);

// Cloudflare Pages headers: extensionless stubs need an explicit module
// content-type; versioned directories are immutable forever.
const headerLines = [
  ...packages.flatMap((pkg) => [
    `/${pkg}`,
    "  Content-Type: text/javascript; charset=utf-8",
    "  Cache-Control: public, max-age=300",
    "",
  ]),
  "/*@*/*",
  "  Cache-Control: public, max-age=31536000, immutable",
  "",
];
await writeFile(path.join(outRoot, "_headers"), headerLines.join("\n"));

// The manifest fragment: this is the "final step" — the same build that
// produced the modules produces the manifest's third-party section, so the
// pinned URLs can never drift from what is actually deployed.
const ts = [
  "// GENERATED by deps/build.mjs — do not edit.",
  "// Third-party import-map entries for the self-hosted dependency CDN.",
  "// Version source of truth: deps/package.json. Rebuild: (cd deps && npm run build).",
  "",
  "export const depImports = " + JSON.stringify(generated, null, 2) + " as const;",
  "",
  "export const depVersions = " + JSON.stringify(versions, null, 2) + " as const;",
  "",
].join("\n");
await mkdir(path.join(here, "generated"), { recursive: true });
await writeFile(path.join(here, "generated", "deps-imports.ts"), ts);

console.log(`built ${packages.length} packages, ${Object.keys(generated).length} entrypoints -> ${path.relative(process.cwd(), outRoot)}`);
for (const [spec, url] of Object.entries(generated)) {
  console.log(`  ${spec} -> ${url}`);
}
