"use client"

import { useTranslations } from "next-intl"
import { IconPhotoOff } from "@tabler/icons-react"

import { cn } from "@/lib/utils"

/** Neutral placeholder for products without any product_images row */
export function MissingPhoto({ className }: { className?: string }) {
  const t = useTranslations("productForm")
  return (
    <div
      className={cn(
        "flex size-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed bg-muted text-muted-foreground",
        className
      )}
      title={t("missingPhoto")}
    >
      <IconPhotoOff className="size-4" />
      <span className="px-0.5 text-center text-[8px] leading-tight">{t("missingPhoto")}</span>
    </div>
  )
}
