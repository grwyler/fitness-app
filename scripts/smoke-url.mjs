const targetUrl = process.argv[2];

if (!targetUrl) {
  throw new Error("Usage: node scripts/smoke-url.mjs https://your-production-url");
}

const response = await fetch(targetUrl, {
  headers: {
    accept: "text/html"
  }
});
const contentType = response.headers.get("content-type") ?? "";
const body = await response.text();

if (!response.ok) {
  throw new Error(`Expected ${targetUrl} to return 2xx, received ${response.status}.`);
}

if (!contentType.includes("text/html")) {
  throw new Error(`Expected ${targetUrl} to serve HTML, received ${contentType || "no content type"}.`);
}

if (!body.includes('<div id="root">')) {
  throw new Error(`Expected ${targetUrl} to serve the Expo web HTML shell.`);
}

if (body.includes('"code":"NOT_FOUND"') || body.includes('"Route not found."')) {
  throw new Error(`${targetUrl} is serving the API 404 payload instead of the mobile web app.`);
}

console.log(`Deployment smoke check passed for ${targetUrl}.`);
