export const PROFESSIONS = [
  "Artist", "Producer", "Beatmaker", "Songwriter", "Composer", "Engineer",
  "A&R", "Manager", "Videographer", "Photographer", "Designer",
  "Visual Creative", "Session Musician", "Studio Owner", "Project Coordinator",
  "Other Creative",
] as const;

export type Profession = (typeof PROFESSIONS)[number];
export const APPLICATION_STATUSES = [
  "draft", "submitted", "under_review", "approved", "rejected", "changes_requested",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type Decision = "under_review" | "approved" | "rejected" | "changes_requested";

export function validProfession(value: string): value is Profession {
  return (PROFESSIONS as readonly string[]).includes(value);
}
export function validDecision(value: string): value is Decision {
  return ["under_review","approved","rejected","changes_requested"].includes(value);
}
export function canApplicantEdit(status: string | null | undefined) {
  return !status || status === "draft" || status === "changes_requested";
}
export function canReview(from: string, to: string) {
  return ["submitted", "under_review"].includes(from)
    && validDecision(to)
    && !(from === "under_review" && to === "under_review");
}
export function cleanPortfolio(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 500) throw new Error("Keep your portfolio URL under 500 characters.");
  let url: URL;
  try { url = new URL(trimmed); }
  catch { throw new Error("Enter a valid portfolio link."); }
  if (!["https:", "http:"].includes(url.protocol) || !url.hostname) {
    throw new Error("Portfolio links must use http or https.");
  }
  return url.toString();
}
export function parseApplicationFields(values: {
  profession: string; displayName: string; bio: string;
  skills: string; experienceYears: string; portfolio: string;
}) {
  if (!validProfession(values.profession)) throw new Error("Choose a valid profession.");
  const display_name = values.displayName.trim().slice(0, 120);
  if (!display_name || values.displayName.trim().length > 120) throw new Error("Enter your professional name (up to 120 characters).");
  const bio = values.bio.trim();
  if (bio.length > 2000) throw new Error("Keep your introduction under 2,000 characters.");
  const skills = [...new Set(values.skills.split(",").map(s => s.trim()).filter(Boolean))];
  if (skills.length > 15 || skills.some(s => s.length > 60)) throw new Error("List up to 15 skills, each under 60 characters.");
  const experience_years = values.experienceYears.trim() === "" ? null : Number(values.experienceYears);
  if (experience_years !== null && (!Number.isInteger(experience_years) || experience_years < 0 || experience_years > 80)) {
    throw new Error("Experience must be a whole number between 0 and 80.");
  }
  return {
    profession: values.profession,
    display_name,
    bio,
    skills,
    experience_years,
    portfolio_url: cleanPortfolio(values.portfolio),
  };
}
export function applicationStatusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
}
export function missingApplicationsSchema(error: {code?: string; message?: string} | null) {
  return Boolean(error && (["42P01","PGRST205","PGRST204"].includes(error.code || "")
    || /professional_applications.*(not found|does not exist)/i.test(error.message || "")));
}
