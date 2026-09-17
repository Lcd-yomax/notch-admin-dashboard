import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Removes accents: "Écran" -> "Ecran" */
export function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "")
}

/** "Galaxy A55 Écran" -> "galaxy-a55-ecran" */
export function slugify(value: string) {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
