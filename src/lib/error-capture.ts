// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

import { isRequestAbort } from "./request-errors";

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  if (isRequestAbort(error)) return;
  lastCapturedError = { error, at: Date.now() };
}

// The dev HTTP adapter logs ECONNRESET through console.error before the request
// reaches our fetch wrapper. Keep that expected disconnect out of the runtime
// error overlay while forwarding every genuine application error unchanged.
const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  if (args.some((argument) => isRequestAbort(argument))) return;
  originalConsoleError(...args);
};

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) => {
    const rejection = event as PromiseRejectionEvent;
    if (isRequestAbort(rejection.reason)) {
      rejection.preventDefault();
      return;
    }
    record(rejection.reason);
  });
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
