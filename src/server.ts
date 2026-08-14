import "./lib/error-capture";

import app from "@tanstack/react-start/server-entry";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  return response;
}

async function handleSsrResponse(request: Request, response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  // Client navigated away / cancelled the request — not an app error, don't report it.
  if (request.signal?.aborted) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; message?: string; cause?: unknown };
  if (e.name === "AbortError" || e.message === "aborted") return true;
  return isAbortError(e.cause);
}

export default {
  async fetch(request: Request) {
    try {
      const response = await app.fetch(request);
      return await handleSsrResponse(request, response);
    } catch (error) {
      if (isAbortError(error) || request.signal?.aborted) {
        return new Response(null, { status: 499 });
      }
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
