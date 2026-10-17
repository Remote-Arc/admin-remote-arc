# Remote Arc Admin

Independent Admin frontend and Cloudflare Worker backend, prepared locally for `Remote-Arc/admin-remote-arc`. **Not published, deployed, or switched into production.**

The existing console and Operations UI were extracted from Remote Arc master `ae207e0b9769800123f5f3c939e116d38eee3735`. This repository owns the Admin UI, browser API boundary, security headers, private HTML authorization and its release pipeline. Core account/device/usage/entitlement data stay authoritative in the main platform.

## Local validation

Node 24, pnpm 10.17.1:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm test:policy
pnpm build
pnpm dry-run
```

`pnpm test` measures every independent Worker business module, with 90% floors for statements, lines, branches and functions. Local `pnpm deploy` is blocked. For a UI-only preview use `VITE_ADMIN_PREVIEW=1 pnpm build` and `wrangler.preview.jsonc`; that Worker has no platform binding and refuses private API requests.

## Identity and API boundary

The browser calls the same-origin Admin API. The Worker forwards only an explicit path/method allowlist to the main relay's named `AdminApiService` entrypoint over `PLATFORM_ADMIN`. It retains the real shared session cookie, mutation Origin, content type, query and body; browser-supplied role/identity headers are discarded. The relay resolves the session and current administrator role from its real database on every request. All mutations require the exact configured Admin Origin and JSON content type. Bodies are bounded to 16 KiB. No broad proxy, arbitrary SQL, OAuth/device credentials or browser service token is exposed.

Login remains at `mcp.remotearc.app`; the existing HttpOnly/Secure `rl_session` cookie covers `.remotearc.app`. This project has no D1, DeviceRegistry or Google/Resend/Billing credentials. Billing reads continue through the core's existing authorized route. No duplicate scheduler or database migration runs here.

## Activation prerequisites and reversible rollout

1. Verify organization repository authorization and create the private repository using the exact confirmed organization. Set a protected `production` GitHub environment with the existing authorized reviewer and scoped Cloudflare deployment secret. Do not use an unprotected auto-created environment.
2. Merge and explicitly promote the main platform boundary: named `AdminApiService`, mode still `legacy`. Existing customer/MCP/Agent flows are unchanged. Reuse the conditional D1 preflight from PR #182: backup confirmation is needed only if migrations are pending.
3. Deploy this Worker independently, with `routes:[]` and `workers_dev:false` as committed. It must not claim the live Admin custom domain during preparation. Verify the production account and service binding target before this step.
4. In a staged platform with isolated D1/session fixtures, bind main's `ADMIN_UI` to `remote-arc-admin` and new Worker's `PLATFORM_ADMIN` to the corresponding relay's `AdminApiService`. Check unauthorized 401/login, normal user 403, revoked role, exact-origin mutation failures, credit idempotency, read-only billing failure, leads changes, partial outage, no public/MCP access to Admin API, and real customer/MCP regression.
5. After explicit production approval, add `ADMIN_UI` to main's configuration and change `ADMIN_SERVICE_MODE` from `legacy` to `external`. The main Worker continues owning the Admin hostname and forwards to this independently released service. Named core API calls bypass public routing, so there is no proxy loop. Missing/downstream bindings fail closed with 503.
6. Roll back by restoring `legacy` on main and promoting the previous approved configuration. No D1 rollback is required: storage, sessions, entitlements and DO namespace never moved. Independently roll back an Admin Worker version when appropriate.
7. Only after cutover verification, remove obsolete main UI imports/files in a separate cleanup PR. If moving the custom domain directly later, remove it from main's Wrangler routes in the same reviewed cutover plan; otherwise a later main deployment could reclaim it. Keep the minimal controlled core API for platform-owned data.

## Independent production release

`.github/workflows/deploy.yml` is manual only, requires latest master exact-SHA green CI and protected `production` approval, verifies the configured Cloudflare account, and never runs D1 migrations. Repository transfer, secret configuration, domain ownership and live promotion remain explicit owner-reviewed actions. Updating Admin code thereafter needs only this repository's release.
