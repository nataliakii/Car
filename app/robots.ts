import { MetadataRoute } from "next";
import { PRODUCTION_BASE_URL } from "@config/seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = PRODUCTION_BASE_URL;
  
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/login", "/car/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
