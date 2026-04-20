import type { MetadataRoute } from "next";
import { getSiteUrl, isProductionDeployment } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  if (!isProductionDeployment()) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
