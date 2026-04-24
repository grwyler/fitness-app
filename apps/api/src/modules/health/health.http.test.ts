import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createApp } from "../../app.js";
import type { HttpTestCase } from "../workout/http/test-helpers/http-test-case.js";

async function startHttpServer() {
  const server = createServer(createApp());

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected health test server to listen on an ephemeral port.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, any>;
}

export const healthHttpTestCases: HttpTestCase[] = [
  {
    name: "GET /health returns API health metadata",
    run: async () => {
      const server = await startHttpServer();

      try {
        const response = await fetch(`${server.baseUrl}/health`);
        const payload = await readJson(response);

        assert.equal(response.status, 200);
        assert.equal(payload.data.status, "ok");
        assert.equal(payload.data.service, "fitness-api");
      } finally {
        await server.close();
      }
    }
  }
];
