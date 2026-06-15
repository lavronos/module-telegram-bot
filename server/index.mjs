export async function handleRequest(request, context) {
  if (!/^(?:avatar|config|menu|users\/[^/]+(?:\/avatar)?)$/.test(context.path)) {
    return Response.json({ ok: false, error: { message: "Telegram Bot module route not found." } }, { status: 404 });
  }

  const target = new URL(`/api/telegram/${context.path}`, request.url);
  target.search = new URL(request.url).search;
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  return fetch(target, {
    method: request.method,
    headers: request.headers,
    body,
    redirect: "manual"
  });
}
