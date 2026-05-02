import { EnvConfigError, getEnv } from "../config/env.js";

function shouldValidateEnv() {
  return process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";
}

if (!shouldValidateEnv()) {
  process.exit(0);
}

try {
  getEnv();
  console.log("API environment configuration looks valid for production.");
} catch (error) {
  if (error instanceof EnvConfigError) {
    console.error(error.message);
  } else {
    console.error("API environment validation failed.");
    console.error(error);
  }

  process.exit(1);
}

