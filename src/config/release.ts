export const YSELLO_RELEASE_ID = "2026-09-05.4";
export const DARK_SHOPPING_INTEGRATION_VERSION = YSELLO_RELEASE_ID;
export const DARK_SHOPPING_EXPECTED_REPOSITORY = "Imtiaz6228/ysello";
export const DARK_SHOPPING_EXPECTED_BRANCH = "main";

export function railwayReleaseMetadata() {
  const value = (name: string) => process.env[name]?.trim() || null;
  const owner = value("RAILWAY_GIT_REPO_OWNER");
  const name = value("RAILWAY_GIT_REPO_NAME");
  const repository = owner && name ? `${owner}/${name}` : name;
  const commit = value("RAILWAY_GIT_COMMIT_SHA");

  return {
    releaseId: YSELLO_RELEASE_ID,
    project: value("RAILWAY_PROJECT_NAME"),
    service: value("RAILWAY_SERVICE_NAME"),
    environment: value("RAILWAY_ENVIRONMENT_NAME"),
    repository,
    branch: value("RAILWAY_GIT_BRANCH"),
    commit: commit?.slice(0, 12) ?? null,
  };
}
