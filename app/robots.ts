import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base=process.env.NEXT_PUBLIC_SITE_URL||"https://music.facktsafrica.co.ke";
  return {rules:{userAgent:"*",allow:["/","/about","/partner","/contact"],disallow:["/workspace","/people","/beats","/tracks","/sessions","/tasks","/settings"]},sitemap:`${base}/sitemap.xml`};
}
