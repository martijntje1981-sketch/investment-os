type SupabaseErrorShape = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export function isSupabaseError(error: unknown): error is SupabaseErrorShape {
  return (
    typeof error === "object" &&
    error !== null &&
    ("code" in error || "message" in error || "details" in error)
  );
}

export function formatSupabaseError(error: unknown): string {
  if (!isSupabaseError(error)) {
    return error instanceof Error ? error.message : "Unknown database error.";
  }

  if (error.code === "23505") {
    return "This import conflicts with an existing portfolio record. Retry the import; if it persists, use portfolio recovery or contact support.";
  }

  const parts: string[] = [];

  if (error.code) {
    parts.push(`[${error.code}]`);
  }

  if (error.message) {
    parts.push(error.message);
  }

  if (error.details) {
    parts.push(error.details);
  }

  if (error.hint) {
    parts.push(error.hint);
  }

  return parts.join(" ") || "Database error.";
}

export function supabaseErrorCode(error: unknown): string | undefined {
  return isSupabaseError(error) ? error.code : undefined;
}
