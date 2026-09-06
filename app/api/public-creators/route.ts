import { NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_FIELDS = [
  "id",
  "stage_name",
  "nickname",
  "avatar_url",
  "hero_image_url",
  "bio",
  "epk_tagline",
  "location",
  "skills_genres",
  "top_songs",
  "photo_catalog",
  "achievements",
  "creator_types",
  "profile_visibility",
  "public_slug",
  "account_status",
].join(",");

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    : [];
}

function publicName(profile: Record<string, unknown>) {
  return text(profile.stage_name) || text(profile.nickname) || "FACKTS Music Creator";
}

function profileScore(profile: Record<string, unknown>) {
  let score = 0;
  if (text(profile.avatar_url) || text(profile.hero_image_url)) score += 5;
  if (text(profile.epk_tagline) || text(profile.bio)) score += 3;
  if (stringArray(profile.creator_types).length) score += 2;
  if (stringArray(profile.skills_genres).length) score += 1;
  if (Array.isArray(profile.top_songs) && profile.top_songs.length) score += 2;
  if (text(profile.public_slug)) score += 1;
  return score;
}

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select(PUBLIC_FIELDS)
      .eq("profile_visibility", "public")
      .eq("account_status", "active")
      .limit(100);

    if (error) {
      console.error("Public creators feed error:", error);
      return NextResponse.json({ creators: [], error: "Unable to load public creators." }, { status: 500 });
    }

    const creators = (data ?? [])
      .map((profile: Record<string, unknown>) => {
        const id = text(profile.id);
        const publicSlug = text(profile.public_slug);
        const photoCatalog = stringArray(profile.photo_catalog);
        const imageUrl = text(profile.avatar_url) || text(profile.hero_image_url) || photoCatalog[0] || "";
        const tagline = text(profile.epk_tagline) || text(profile.bio);
        const topSongs = Array.isArray(profile.top_songs) ? profile.top_songs : [];
        const achievements = stringArray(profile.achievements);

        return {
          id,
          name: publicName(profile),
          creatorTypes: stringArray(profile.creator_types),
          tagline,
          location: text(profile.location),
          skills: stringArray(profile.skills_genres),
          imageUrl,
          topSongsCount: topSongs.length,
          achievementsCount: achievements.length,
          publicSlug,
          profileUrl: `/creators/${encodeURIComponent(publicSlug || id)}`,
          _score: profileScore(profile),
        };
      })
      .filter((creator) => creator.id)
      .sort((left, right) => right._score - left._score || left.name.localeCompare(right.name))
      .map(({ _score, ...creator }) => creator);

    return NextResponse.json(
      { creators },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Public creators feed exception:", error);
    return NextResponse.json({ creators: [], error: "Unable to load public creators." }, { status: 500 });
  }
}
