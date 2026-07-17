/** PostgREST / Supabase error when a table is not in the schema yet */
export function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "PGRST205" || e.code === "42P01") return true;
  const message = String(e.message ?? "");
  return (
    message.includes("Could not find the table") ||
    message.includes("does not exist")
  );
}
