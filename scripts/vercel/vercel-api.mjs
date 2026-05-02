import { readLocalVercelConfig, requireNonEmpty } from "./_lib.mjs";

export function loadVercelApiConfig({ repoRoot, overrides = {} } = {}) {
  const fileConfig = repoRoot ? readLocalVercelConfig(repoRoot) : {};
  const env = { ...fileConfig, ...process.env, ...overrides };

  const token = env.VERCEL_TOKEN;
  const teamId = env.VERCEL_TEAM_ID;

  return {
    token,
    teamId,
    env
  };
}

export async function vercelApiFetch({ token, path, method = "GET", teamId, body } = {}) {
  const resolvedToken = requireNonEmpty("VERCEL_TOKEN", token);
  const url = new URL(`https://api.vercel.com${path}`);
  if (teamId) {
    url.searchParams.set("teamId", teamId);
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${resolvedToken}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Vercel API error (${response.status}) ${method} ${url.toString()}\n${text}`);
  }

  return response.json();
}

