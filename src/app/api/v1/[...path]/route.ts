import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  if (path.some((p) => p === ".." || p === "." || /[\\/]/.test(p)))
    return Response.json(
      { error: { code: "INVALID_PATH", message: "Invalid API path." } },
      { status: 400 },
    );
  let requestBody: ArrayBuffer | undefined;
  if (!["GET", "HEAD"].includes(request.method) && request.body) {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > 3 * 1024 * 1024) {
        await reader.cancel();
        return Response.json(
          {
            error: {
              code: "PAYLOAD_TOO_LARGE",
              message: "Requests must be at most 3 MiB.",
            },
          },
          { status: 422, headers: { "Cache-Control": "no-store" } },
        );
      }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    requestBody = bytes.buffer;
  }
  const headers = new Headers();
  for (const name of [
    "content-type",
    "cookie",
    "authorization",
    "origin",
    "range",
    "if-range",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const response = await fetch(
      `${process.env.INTERNAL_API_URL || "http://api:8080"}/api/v1/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`,
      {
        method: request.method,
        headers,
        body: requestBody,
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(35000),
      },
    );
    const outgoing = new Headers({ "Cache-Control": "no-store" });
    for (const name of [
      "content-type",
      "content-disposition",
      "retry-after",
      "x-request-id",
      "content-range",
      "accept-ranges",
      "content-length",
      "last-modified",
    ]) {
      const value = response.headers.get(name);
      if (value) outgoing.set(name, value);
    }
    for (const cookie of response.headers.getSetCookie())
      outgoing.append("set-cookie", cookie);
    return new Response(response.body, {
      status: response.status,
      headers: outgoing,
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "UNAVAILABLE",
          message:
            "Call Coach is temporarily unavailable. Your pending work is retained.",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
