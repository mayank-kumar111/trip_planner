import { statSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = process.cwd();
const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function resolveFile(base) {
  if (isFile(base)) return base;
  for (const extension of extensions) {
    const candidate = `${base}${extension}`;
    if (isFile(candidate)) return candidate;
  }
  return null;
}

function resolveAlias(specifier) {
  if (!specifier.startsWith("@/")) return null;
  return resolveFile(resolvePath(projectRoot, specifier.slice(2)));
}

function resolveRelative(specifier, parentURL) {
  if (!specifier.startsWith(".") || !parentURL) return null;
  const parentPath = fileURLToPath(parentURL);
  return resolveFile(resolvePath(dirname(parentPath), specifier));
}

export async function resolve(specifier, context, nextResolve) {
  const filePath = resolveAlias(specifier) ?? resolveRelative(specifier, context.parentURL);
  if (filePath) return nextResolve(pathToFileURL(filePath).href, context);
  return nextResolve(specifier, context);
}
