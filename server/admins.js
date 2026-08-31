export const ADMIN_EMAILS = [
  "serpokrylova@vegas.by",
  "trener@vegas.by",
  "kanyushik@vegas.by",
];

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(String(email || "").trim().toLowerCase());
}
