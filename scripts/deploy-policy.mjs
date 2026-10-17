export function assertProductionContext(env) {
  if (env.GITHUB_ACTIONS !== "true" || env.GITHUB_EVENT_NAME !== "workflow_dispatch" ||
      env.GITHUB_REF !== "refs/heads/master" || env.GITHUB_REPOSITORY !== "Remote-Arc/admin-remote-arc" ||
      env.GITHUB_ACTOR !== "yaohuangguan" || env.REMOTEARC_PRODUCTION_DEPLOY !== "github-actions" ||
      !/^[0-9a-f]{40}$/.test(env.GITHUB_SHA || "")) {
    throw new Error("Production requires approved manual GitHub Actions promotion of the latest green master SHA.");
  }
}
