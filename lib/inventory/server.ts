import type { createAdminClient } from "@/lib/supabase/server"

type Admin = ReturnType<typeof createAdminClient>

/** Values already used as imei or imei2 in device_units, checked in one query */
export async function findExistingImeis(supabase: Admin, values: string[]) {
  // Only 15-digit values reach the filter string, so it cannot be injected
  const list = [...new Set(values.filter((v) => /^\d{15}$/.test(v)))]
  if (list.length === 0) return { existing: [] as string[], error: null }

  const joined = list.join(",")
  const { data, error } = await supabase
    .from("device_units")
    .select("imei, imei2")
    .or(`imei.in.(${joined}),imei2.in.(${joined})`)

  if (error) return { existing: [] as string[], error: error.message }

  const used = new Set<string>()
  for (const row of data || []) {
    if (row.imei) used.add(row.imei)
    if (row.imei2) used.add(row.imei2)
  }
  return { existing: list.filter((v) => used.has(v)), error: null }
}
