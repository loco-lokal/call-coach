export function GET() {
  return Response.json({
    status: "ok",
    service: "web",
    stage: "component-review",
  });
}
