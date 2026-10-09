import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "README.md",
  ".env.example",
  "docs/README.md",
  "docs/MANIFEST_REGISTRY.md",
  "docs/CONFIGURATION_REGISTRY.md",
  "docs/API_SPECIFICATION.md",
  "docs/SECURITY.md",
  "docs/architecture/README.md",
  "docs/ops/README.md",
  "docs/guides/README.md",
  "docs/folder_guides/README.md",
  ".github/workflows/ci.yml",
];

const missing = requiredFiles.filter((file) => !existsSync(join(root, file)));

// Source trees whose directories are part of the maintainable application surface.
const sourceRoots = ["app", "components", "context", "convex", "hooks", "lib", "tests", "public"];
const ignoredDirectories = new Set([
  "node_modules",
  ".next",
  ".git",
  "convex/_generated",
]);
const undocumented = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const full = join(dir, entry.name);
    const relativePath = relative(root, full).replaceAll("\\", "/");
    if (!entry.isDirectory()) continue;
    if (ignoredDirectories.has(relativePath)) continue;

    const readme = join(full, "README.md");
    if (!existsSync(readme)) undocumented.push(relativePath);
    walk(full);
  }
}

for (const sourceRoot of sourceRoots) {
  const full = join(root, sourceRoot);
  if (existsSync(full) && statSync(full).isDirectory()) walk(full);
}

if (missing.length || undocumented.length) {
  if (missing.length) console.error("Missing required documentation files:", missing);
  if (undocumented.length) console.error("Directories without README.md:", undocumented);
  process.exit(1);
}

console.log("Documentation check passed: required registries and source-directory READMEs are present.");
