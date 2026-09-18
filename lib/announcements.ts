// Pop-up settings of announcements (columns added by add_packs_and_popups.sql)

export const POPUP_MIGRATION_WARNING =
  "Délai et affichage unique non enregistrés : exécutez la migration add_packs_and_popups.sql"

export function popupFields(body: any) {
  const fields: Record<string, unknown> = {}
  const delay = Number(body?.display_delay_seconds)
  if (Number.isFinite(delay)) fields.display_delay_seconds = Math.min(120, Math.max(0, Math.round(delay)))
  if (typeof body?.show_once === "boolean") fields.show_once = body.show_once
  return fields
}

export function isMissingPopupColumn(message: string) {
  return /display_delay_seconds|show_once/.test(message)
}
