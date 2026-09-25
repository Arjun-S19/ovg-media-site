import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const publicEntries = ["assets", "css", "js", "about", "index.html", "404.html", ".nojekyll"];

if (path.dirname(dist) !== root || path.basename(dist) !== "dist") {
  throw new Error(`Refusing to replace unsafe build path: ${dist}`);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of publicEntries) {
  await cp(path.join(root, entry), path.join(dist, entry), { recursive: true });
}

try {
  await cp(path.join(root, "CNAME"), path.join(dist, "CNAME"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const htmlFiles = ["index.html", path.join("about", "index.html")];
const versions = new Map();

const versionedUrl = async (url, htmlPath) => {
  const [resource] = url.split(/[?#]/, 1);
  if (!/^\.\.?\//.test(resource) || !/\.(?:css|js)$/i.test(resource)) return url;

  const file = path.resolve(path.dirname(htmlPath), resource);
  if (!file.startsWith(`${dist}${path.sep}`)) {
    throw new Error(`Local resource escapes the production artifact: ${url}`);
  }

  if (!versions.has(file)) {
    versions.set(
      file,
      createHash("sha256").update(await readFile(file)).digest("hex").slice(0, 10),
    );
  }

  return `${resource}?v=${versions.get(file)}`;
};

for (const relativeHtmlPath of htmlFiles) {
  const htmlPath = path.join(dist, relativeHtmlPath);
  let html = await readFile(htmlPath, "utf8");
  const matches = [...html.matchAll(/\b(?:href|src)=(['"])([^'"]+)\1/g)];

  for (const match of matches) {
    const versioned = await versionedUrl(match[2], htmlPath);
    if (versioned !== match[2]) html = html.replace(match[0], match[0].replace(match[2], versioned));
  }

  await writeFile(htmlPath, html);
}

const scanTextFiles = async (directory) => {
  const entries = await readdir(directory);
  const files = [];

  for (const entry of entries) {
    const file = path.join(directory, entry);
    if ((await stat(file)).isDirectory()) files.push(...await scanTextFiles(file));
    else if (/\.(?:html|css|js)$/i.test(file)) files.push(file);
  }

  return files;
};

for (const file of await scanTextFiles(dist)) {
  const content = await readFile(file, "utf8");
  if (/OVG_OMS_Designs|(?:href|src)=(['"])\/(?:ovg|oms|ovg-media)(?:\/|\1)/i.test(content)) {
    throw new Error(`Domain-specific path found in ${path.relative(dist, file)}`);
  }
}

console.log("Built OVG! Media production site in dist/.");
