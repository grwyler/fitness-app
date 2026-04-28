const targetUrl = process.argv[2];

if (!targetUrl) {
  throw new Error("Usage: node scripts/smoke-api-url.mjs https://your-api-url");
}

const baseUrl = targetUrl.replace(/\/+$/, "");
const healthUrl = `${baseUrl}/health`;
const response = await fetch(healthUrl, {
  headers: {
    accept: "application/json"
  }
});
const contentType = response.headers.get("content-type") ?? "";
const body = await response.text();

if (!response.ok) {
  throw new Error(`Expected ${healthUrl} to return 2xx, received ${response.status}.`);
}

if (!contentType.includes("application/json")) {
  throw new Error(`Expected ${healthUrl} to serve JSON, received ${contentType || "no content type"}.`);
}

let payload;
try {
  payload = JSON.parse(body);
} catch (error) {
  throw new Error(`Expected ${healthUrl} to return valid JSON. ${error.message}`);
}

if (payload?.data?.status !== "ok") {
  throw new Error(`Expected ${healthUrl} to return data.status="ok".`);
}

console.log(`API deployment smoke check passed for ${healthUrl}.`);
