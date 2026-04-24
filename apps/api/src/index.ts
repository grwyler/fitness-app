import { createPostgresRuntimeApp } from "./bootstrap.js";

const runtime = createPostgresRuntimeApp();

export const app = runtime.app;
export default app;
