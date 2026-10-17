import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "react-native") return { url: pathToFileURL(resolve(__dirname, "react-native.test-mock.js")).href, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

void import("./run-mobile-test-cases.js").catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
