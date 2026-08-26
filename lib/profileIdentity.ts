type IdentityProfile = {
  full_name?: string | null;
  stage_name?: string | null;
  nickname?: string | null;
  email?: string | null;
};

const clean = (value?: string | null) => value?.trim() || "";

export function creatorDisplayName(profile?: IdentityProfile | null) {
  return clean(profile?.stage_name) || clean(profile?.nickname) || clean(profile?.full_name) || clean(profile?.email)?.split("@")[0] || "Creator";
}

export function legalNameWithStageName(profile?: IdentityProfile | null) {
  const legalName = clean(profile?.full_name);
  const stageName = clean(profile?.stage_name);
  if (!legalName) return stageName || "Creator";
  if (!stageName || legalName.toLowerCase().includes(stageName.toLowerCase())) return legalName;
  const parts = legalName.split(/\s+/);
  if (parts.length === 1) return `${legalName} \"${stageName}\"`;
  return `${parts[0]} \"${stageName}\" ${parts.slice(1).join(" ")}`;
}
