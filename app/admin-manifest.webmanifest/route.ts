const manifest = {
  id: "/admin-control-room",
  name: "FACKTS Music Control Room",
  short_name: "Control Room",
  description: "Private FACKTS Music management environment.",
  start_url: "/admin",
  scope: "/admin/",
  display: "standalone",
  orientation: "any",
  background_color: "#f3ecdf",
  theme_color: "#f3ecdf",
  icons: [
    {
      src: "/branding/fackts-music-logo.png",
      sizes: "1250x1250",
      type: "image/png",
    },
    {
      src: "/branding/fackts-music-logo.png",
      sizes: "1250x1250",
      type: "image/png",
      purpose: "maskable",
    },
  ],
};

export function GET() {
  return Response.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/manifest+json",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
