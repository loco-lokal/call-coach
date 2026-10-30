import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
export async function requireSession() {
  const path = (await headers()).get("x-call-coach-path") || "/scripts";
  const login = `/login?next=${encodeURIComponent(path)}`;
  const jar = await cookies();
  const cookie = jar.get("call_coach_session");
  if (!cookie) redirect(login);
  let status = 503;
  try {
    const response = await fetch(
      `${process.env.INTERNAL_API_URL || "http://api:8080"}/api/v1/auth/session`,
      {
        headers: { cookie: `call_coach_session=${cookie.value}` },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      },
    );
    status = response.status;
  } catch {}
  if (status === 401) redirect(login);
  if (status !== 200)
    throw new Error(
      "Call Coach storage is temporarily unavailable. Please retry.",
    );
}
