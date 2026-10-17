type Service = { fetch(request: Request): Promise<Response> };
export type AdminEnv = { ASSETS: Service; PLATFORM_ADMIN?: Service; ADMIN_ORIGIN: string; APP_ORIGIN: string; ADMIN_MODE?: "production" | "preview" };
const routes: Record<string, string[]> = {
  "/api/me": ["GET"], "/api/monitor": ["GET"], "/api/admin/operations": ["GET"],
  "/api/admin/billing": ["GET"], "/api/admin/call-credits": ["POST"],
  "/api/admin/plan-grants": ["GET", "POST"], "/api/admin/submissions": ["GET"],
};
function methods(path: string) {
  if (Object.hasOwn(routes, path)) return routes[path]!;
  if (/^\/api\/admin\/plan-grants\/[a-zA-Z0-9-]+\/revoke$/.test(path)) return ["POST"];
  if (/^\/api\/admin\/submissions\/[a-zA-Z0-9-]+$/.test(path)) return ["PATCH", "DELETE"];
  return null;
}
function secure(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "private, no-store");
  headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "no-referrer");
  headers.set("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  return new Response(response.body, { status: response.status, headers });
}
const error = (message: string, status: number) => secure(Response.json({ error: message }, { status }));
async function boundedBody(request: Request): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 16384) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const result = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}
async function platform(request: Request, env: AdminEnv, identityOnly = false): Promise<Response> {
  if (!env.PLATFORM_ADMIN) return error("admin_service_not_configured", 503);
  const headers = new Headers({ accept: "application/json" });
  for (const key of ["cookie", "origin", "content-type"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  const write = !identityOnly && !["GET", "HEAD"].includes(request.method);
  const body = write ? await boundedBody(request) : undefined;
  if (body === null) return error("request_too_large", 413);
  const path = identityOnly ? "/api/me" : new URL(request.url).pathname + new URL(request.url).search;
  const upstream = new Request(new URL(path, env.ADMIN_ORIGIN), {
    method: identityOnly ? "GET" : request.method, headers,
    ...(write ? { body: body as BodyInit } : {}), signal: AbortSignal.timeout(8000),
  });
  try { return secure(await env.PLATFORM_ADMIN.fetch(upstream)); }
  catch { return error("admin_service_unavailable", 503); }
}

export async function handleAdminRequest(request: Request, env: AdminEnv): Promise<Response> {
  const url = new URL(request.url);
  const preview = env.ADMIN_MODE === "preview";
  if (!preview && url.origin !== new URL(env.ADMIN_ORIGIN).origin) return error("admin_host_required", 404);
  if (url.pathname.startsWith("/api/")) {
    if (preview) return error("preview_private_data_disabled", 503);
    const allowed = methods(url.pathname);
    if (!allowed) return error("not_found", 404);
    if (!allowed.includes(request.method)) return error("method_not_allowed", 405);
    if (request.method !== "GET") {
      if (request.headers.get("origin") !== url.origin) return error("invalid_origin", 403);
      if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json") return error("unsupported_media_type", 415);
    }
    return platform(request, env);
  }
  if (url.pathname === "/robots.txt") return secure(new Response("User-agent: *\nDisallow: /\n"));
  const document = ["/", "/overview", "/index.html"].includes(url.pathname);
  if (document) {
    if (!["GET", "HEAD"].includes(request.method)) return error("method_not_allowed", 405);
    if (!preview) {
      const identity = await platform(request, env, true);
      if (identity.status === 401) {
        const login = new URL("/auth/login", env.APP_ORIGIN); login.searchParams.set("return_to", env.ADMIN_ORIGIN + "/");
        return secure(Response.redirect(login, 302));
      }
      if (!identity.ok) return identity;
      const data = await identity.json().catch(() => null) as { user?: { isAdmin?: boolean } } | null;
      if (data?.user?.isAdmin !== true) return error("forbidden", 403);
    }
    const response = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
    return secure(request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response);
  }
  if (["GET", "HEAD"].includes(request.method) && (url.pathname.startsWith("/assets/") || url.pathname === "/remote-arc.svg")) return secure(await env.ASSETS.fetch(request));
  return error("not_found", 404);
}
export default { async fetch(request: Request, env: AdminEnv): Promise<Response> { try { return await handleAdminRequest(request, env); } catch { return error("admin_service_unavailable", 503); } } };
