"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { IconPlus, IconX } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { newKey, type ImageDraft } from "@/lib/products/form"

const ALL = "__all__"

export function ProductImagesEditor({
  images,
  onChange,
  colors,
}: {
  images: ImageDraft[]
  onChange: (images: ImageDraft[]) => void
  /** Distinct variation colors the images can be linked to */
  colors: string[]
}) {
  const t = useTranslations("productForm")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = React.useState<Record<string, string>>({})

  // Object URLs for files that are not uploaded yet
  React.useEffect(() => {
    const next: Record<string, string> = {}
    for (const img of images) {
      if (img.file) next[img.key] = previews[img.key] || URL.createObjectURL(img.file)
    }
    for (const [key, url] of Object.entries(previews)) {
      if (!next[key]) URL.revokeObjectURL(url)
    }
    setPreviews(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images])

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ""
    if (files.length === 0) return
    onChange([...images, ...files.map((file) => ({ key: newKey(), url: "", file, color: null }))])
  }

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-medium">{t("images")}</h3>
        {colors.length > 0 && <p className="text-xs text-muted-foreground">{t("imagesColorHint")}</p>}
      </div>
      <div className="flex flex-wrap gap-3">
        {images.map((img, index) => (
          <div key={img.key} className="w-28 space-y-1">
            <div className="relative size-28 overflow-hidden rounded-lg border">
              <img src={img.file ? previews[img.key] : img.url} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((i) => i.key !== img.key))}
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label={t("removeImage")}
              >
                <IconX className="size-3.5" />
              </button>
              {index === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center text-[10px] text-white">
                  {t("mainImage")}
                </div>
              )}
            </div>
            {img.custom ? (
              <Badge variant="outline" className="w-full justify-center text-[10px]" title={t("customImageHint")}>
                {t("customImage")}
              </Badge>
            ) : colors.length > 0 ? (
              <Select
                value={img.color ?? ALL}
                onValueChange={(val) =>
                  onChange(images.map((i) => (i.key === img.key ? { ...i, color: val === ALL ? null : val } : i)))
                }
              >
                <SelectTrigger size="sm" className="h-7 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("allVariants")}</SelectItem>
                  {colors.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  {img.color && !colors.includes(img.color) && (
                    <SelectItem value={img.color}>{img.color}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex size-28 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/25 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
        >
          <IconPlus className="size-5" />
          <span className="text-xs">{t("addImages")}</span>
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddFiles} />
    </div>
  )
}
