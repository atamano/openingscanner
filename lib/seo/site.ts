const DEFAULT_DEV_URL = "http://localhost:3000";

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return stripTrailingSlash(explicit);

  // On Vercel previews, prefer the live deployment URL so canonical/hreflang
  // match the actual origin the visitor is on.
  const branch = process.env.VERCEL_BRANCH_URL;
  if (branch) return `https://${stripTrailingSlash(branch)}`;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${stripTrailingSlash(vercel)}`;

  return DEFAULT_DEV_URL;
}
