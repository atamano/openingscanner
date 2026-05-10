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

// Resolves the canonical origin used in <link rel="canonical">, hreflang, and
// sitemap entries. Resolution order:
//   1. NEXT_PUBLIC_SITE_URL — explicit override. REQUIRED in production: set
//      it to the exact host visitors land on (including the www/non-www
//      variant), otherwise canonicals will point at whichever variant Vercel
//      301s away from and search engines will flag them as redirects.
//   2. VERCEL_BRANCH_URL — preview deployments, so canonicals match the
//      origin the visitor is actually on.
//   3. VERCEL_PROJECT_PRODUCTION_URL — last-resort production fallback. Only
//      correct if the project's primary domain has no host-level redirect.
//   4. localhost — dev.
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return stripTrailingSlash(explicit);

  const branch = process.env.VERCEL_BRANCH_URL;
  if (branch) return `https://${stripTrailingSlash(branch)}`;
  const prodUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prodUrl) return `https://${stripTrailingSlash(prodUrl)}`;

  return DEFAULT_DEV_URL;
}
