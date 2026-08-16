type ErrorLike = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  cause?: unknown;
  status?: unknown;
  statusCode?: unknown;
};

/** A disconnected browser socket is a cancelled request, not an application failure. */
export function isRequestAbort(error: unknown, seen = new Set<object>()): boolean {
  if (!error || typeof error !== "object" || seen.has(error)) return false;
  seen.add(error);

  const value = error as ErrorLike;
  const name = typeof value.name === "string" ? value.name.toLowerCase() : "";
  const message = typeof value.message === "string" ? value.message.toLowerCase() : "";
  const code = typeof value.code === "string" ? value.code.toUpperCase() : "";

  if (
    name === "aborterror" ||
    message === "aborted" ||
    message === "the operation was aborted" ||
    code === "ECONNRESET" ||
    code === "ERR_STREAM_PREMATURE_CLOSE"
  ) {
    return true;
  }

  return isRequestAbort(value.cause, seen);
}