import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = readFileSync(resolve(root, "dist/index.html"), "utf8");
const paths = [...html.matchAll(/(?:src|href)="(\/admin-assets\/[^"]+)"/g)].map(m => m[1]);
assert.ok(paths.some(path => path.endsWith(".js")), "Admin HTML must reference an isolated JS bundle");
assert.ok(paths.some(path => path.endsWith(".css")), "Admin HTML must reference an isolated CSS bundle");
assert.ok(!/\/(?:assets)\//.test(html), "Admin HTML must never reference core-owned /assets/");
for (const path of paths) {
  const file = resolve(root, "dist", "." + path);
  assert.ok(file.startsWith(resolve(root, "dist") + "/"), "Only dist assets allowed");
  assert.ok(statSync(file).isFile(), "Missing emitted static asset: " + path);
  const contents = readFileSync(file);
  assert.ok(contents.length > 100, "Static asset must have nonempty content: " + path);
  assert.ok(!contents.toString("utf8", 0, 60).includes("<!doctype html"), "Script/styles must not serve HTML: " + path);
}
const worker = readFileSync(resolve(root, "src/worker/index.ts"), "utf8");
assert.ok(worker.includes('url.pathname.startsWith("/admin-assets/")'), "Admin Worker must allow isolated asset requests");
console.log("Admin isolated bundle smoke passed:", paths.join(", "));
