/** Maps Supabase errors on the brands table to French messages */
export function brandError(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    return error.message.includes("slug")
      ? { error: "Ce slug est déjà utilisé", field: "slug" }
      : { error: "Cette marque existe déjà", field: "name" }
  }
  return { error: error.message }
}
