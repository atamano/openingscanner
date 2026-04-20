const DEFAULT_DEV_URL = "http://localhost:3000";

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function isProductionDeployment(): boolean {
  // Treat any non-Vercel environment (local dev, self-hosted) as production so
  // running `next start` locally still emits a standard robots/sitemap.
  const vercelEnv = process.env.VERCEL_ENV;
  return !vercelEnv || vercelEnv === "production";
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return stripTrailingSlash(explicit);

  // On production, always use the canonical production URL — sitemap entries
  // have to match their sitemap origin, so the branch alias (which is always
  // present, even on prod) must NOT leak into the sitemap on prod.
  const vercelEnv = process.env.VERCEL_ENV;
  const prodUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelEnv === "production" && prodUrl) {
    return `https://${stripTrailingSlash(prodUrl)}`;
  }

  // On previews, use the branch/preview URL so canonical/hreflang match the
  // origin the visitor is actually on.
  const branch = process.env.VERCEL_BRANCH_URL;
  if (branch) return `https://${stripTrailingSlash(branch)}`;
  if (prodUrl) return `https://${stripTrailingSlash(prodUrl)}`;

  return DEFAULT_DEV_URL;
}
