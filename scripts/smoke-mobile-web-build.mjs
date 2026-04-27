import { createReadStream, existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { createServer } from "node:http";

const repoRoot = resolve(import.meta.dirname, "..");
const distDir = resolve(repoRoot, "apps", "mobile", "dist");
const indexPath = join(distDir, "index.html");

if (!existsSync(indexPath)) {
  throw new Error(`Mobile web build is missing ${indexPath}. Run npm run build:mobile:web first.`);
}

const contentTypes = new Map([
  [".css", "text/css"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript"],
  [".json", "application/json"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"]
]);

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
  const safePath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const filePath = resolve(distDir, `.${safePath}`);
  const resolvedPath = existsSync(filePath) && filePath.startsWith(distDir) ? filePath : indexPath;

  response.setHeader("Content-Type", contentTypes.get(extname(resolvedPath)) ?? "application/octet-stream");
  createReadStream(resolvedPath).pipe(response);
});

const listening = new Promise((resolveListening) => {
  server.listen(0, "127.0.0.1", () => resolveListening(server.address()));
});

try {
  const address = await listening;
  const baseUrl = `http://${address.address}:${address.port}`;
  const rootResponse = await fetch(`${baseUrl}/`);
  const rootBody = await rootResponse.text();

  if (!rootResponse.ok) {
    throw new Error(`Expected / to return 2xx, received ${rootResponse.status}.`);
  }

  if (!rootBody.includes('<div id="root">')) {
    throw new Error("Expected / to serve the Expo web HTML shell.");
  }

  const deepLinkResponse = await fetch(`${baseUrl}/workout-history/example-session`);
  const deepLinkBody = await deepLinkResponse.text();

  if (!deepLinkResponse.ok || !deepLinkBody.includes('<div id="root">')) {
    throw new Error("Expected deep links to fall back to the Expo web HTML shell.");
  }

  console.log("Mobile web build smoke check passed.");
} finally {
  server.close();
}
