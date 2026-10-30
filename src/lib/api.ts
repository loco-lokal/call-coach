export class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public currentRevision?: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...options,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new APIError(
      503,
      "UNAVAILABLE",
      "Connection interrupted. Your pending work is retained.",
    );
  }
  const body = await response.json();
  if (!response.ok)
    throw new APIError(
      response.status,
      body.error?.code || "UNAVAILABLE",
      body.error?.message || "Could not reach Call Coach.",
      body.error?.currentRevision,
    );
  return body as T;
}
export const json = (value: unknown) => JSON.stringify(value);
export const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
export function duration(start: string, end: string | null) {
  if (!end) return "—";
  const secs = Math.max(
    0,
    Math.floor((Date.parse(end) - Date.parse(start)) / 1000),
  );
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}
