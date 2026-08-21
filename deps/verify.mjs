// Verification for the built dependency CDN output:
//   1. Export parity — every built entrypoint exposes the same export names
//      as the npm original (node's view of it).
//   2. Runtime smoke — the built modules actually work: createElement,
//      jsx-runtime, a zustand store, a zod schema, prop-types checking,
//      react-dom/client surface.
// Run after `npm run build`: node verify.mjs

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const outRoot = path.resolve(here, "../build/deps");

const { imports } = JSON.parse(
  await readFile(path.join(outRoot, "import-map.deps.json"), "utf8"),
);

// Simulate the browser import map: a bare specifier imported FROM a built
// module (e.g. react-dom/client.mjs importing "react") resolves to the
// built entrypoint for that specifier, exactly as deps.ferry.rsvp + the
// site import map would serve it. Imports from anywhere else (this script,
// node_modules) resolve normally.
const localUrlFor = (spec) =>
  pathToFileURL(
    path.join(outRoot, imports[spec].replace("https://deps.ferry.rsvp/", "")),
  ).href;
registerHooks({
  resolve(spec, context, nextResolve) {
    if (context.parentURL?.includes("/build/deps/") && imports[spec]) {
      return { url: localUrlFor(spec), shortCircuit: true };
    }
    return nextResolve(spec, context);
  },
});

let failures = 0;
const fail = (msg) => { failures++; console.error(`  FAIL ${msg}`); };

// ---- 1. export parity ------------------------------------------------------
console.log("export parity (built vs npm original):");
const built = {};
for (const [spec, url] of Object.entries(imports)) {
  const rel = url.replace("https://deps.ferry.rsvp/", "");
  const builtMod = await import(pathToFileURL(path.join(outRoot, rel)).href);
  built[spec] = builtMod;
  const origMod = await import(spec);
  const builtKeys = Object.keys(builtMod).sort();
  const origKeys = Object.keys(origMod).sort();
  const missing = origKeys.filter((k) => !builtKeys.includes(k));
  const extra = builtKeys.filter((k) => !origKeys.includes(k));
  if (missing.length) fail(`${spec}: missing exports: ${missing.join(", ")}`);
  else console.log(`  ok   ${spec} (${builtKeys.length} exports${extra.length ? `, extra: ${extra.join(", ")}` : ""})`);
}

// ---- 2. runtime smoke ------------------------------------------------------
console.log("runtime smoke:");
const React = built["react"];
const jsx = built["react/jsx-runtime"];
const el = React.createElement("div", { id: "x" }, "hi");
if (el.type !== "div" || el.props.id !== "x") fail("react.createElement");
else console.log("  ok   react.createElement");

const jel = jsx.jsx("span", { children: "y" });
if (jel.type !== "span") fail("jsx-runtime.jsx");
else console.log("  ok   react/jsx-runtime jsx()");

const store = built["zustand"].createStore((set) => ({
  n: 0,
  inc: () => set((s) => ({ n: s.n + 1 })),
}));
store.getState().inc();
if (store.getState().n !== 1) fail("zustand store");
else console.log("  ok   zustand createStore/setState");

const persisted = built["zustand/middleware"].persist(() => ({ a: 1 }), {
  name: "t",
  storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
});
if (typeof persisted !== "function") fail("zustand/middleware persist");
else console.log("  ok   zustand/middleware persist");

const z = built["zod"].z;
const parsed = z.object({ email: z.string() }).safeParse({ email: "a@b.c" });
if (!parsed.success) fail("zod safeParse");
else console.log("  ok   zod object schema parse");

const PropTypes = built["prop-types"].default;
if (typeof PropTypes?.string?.isRequired !== "function") fail("prop-types surface");
else console.log("  ok   prop-types (CJS->ESM default export)");

if (typeof built["react-dom/client"].createRoot !== "function") fail("react-dom/client.createRoot");
else console.log("  ok   react-dom/client exposes createRoot");

// The singleton property: built react-dom/client must import bare "react",
// never bundle its own copy.
const clientSrc = await readFile(
  path.join(outRoot, "react-dom@19.2.8/client.mjs"), "utf8",
);
if (!/from\s*"react"/.test(clientSrc)) fail("react-dom/client should import bare \"react\"");
else console.log("  ok   react-dom/client externalizes react as bare specifier");

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log("all checks passed");
