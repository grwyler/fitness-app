import { pbkdf2 as pbkdf2Callback, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2 = promisify(pbkdf2Callback);
const ITERATIONS = 210_000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);

  return `pbkdf2$${DIGEST}$${ITERATIONS}$${salt}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) {
    return false;
  }

  const [algorithm, digest, iterationsValue, salt, expectedValue] = storedHash.split("$");
  if (algorithm !== "pbkdf2" || !digest || !iterationsValue || !salt || !expectedValue) {
    return false;
  }

  const iterations = Number(iterationsValue);
  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }

  const actual = await pbkdf2(password, salt, iterations, KEY_LENGTH, digest);
  const expected = Buffer.from(expectedValue, "base64url");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
