export const PROJECT_ADMIN_FINANCE_ROLES = [
  "Super Admin",
  "Admin",
  "Project Lead",
  "Project Admin",
] as const;

export const FINANCE_REPORT_ROLES = [
  "Artist",
  "Producer",
  "Engineer",
  "Songwriter",
  "Composer",
  "Session Musician",
  "A&R",
  "Manager",
  "Studio Owner",
  "Finance",
] as const;

export function canEditProjectFinance(roles:string[]){
  return PROJECT_ADMIN_FINANCE_ROLES.some((role)=>roles.includes(role));
}

export function canViewProjectFinanceReport(roles:string[]){
  return canEditProjectFinance(roles) ||
    FINANCE_REPORT_ROLES.some((role)=>roles.includes(role));
}
