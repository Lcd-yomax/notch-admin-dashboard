"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { slugify } from "@/lib/utils"

export interface Brand {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_at: string
  products_count: number
}

export function BrandForm({
  brand,
  initialName,
  onSaved,
  onCancel,
}: {
  brand?: Brand | null
  initialName?: string
  onSaved: (brand: Brand) => void
  onCancel: () => void
}) {
  const t = useTranslations("brands")
  const tc = useTranslations("common")
  const [name, setName] = React.useState(brand?.name || initialName || "")
  const [slug, setSlug] = React.useState(brand?.slug || slugify(initialName || ""))
  // Keep generating the slug from the name until the user edits the slug by hand
  const [slugTouched, setSlugTouched] = React.useState(!!brand)
  const [logoUrl, setLogoUrl] = React.useState(brand?.logo_url || "")
  const [uploading, setUploading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [errors, setErrors] = React.useState<{ name?: string; slug?: string; form?: string }>({})
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.url) {
        setLogoUrl(data.url)
      } else {
        setErrors((prev) => ({ ...prev, form: data.error || t("uploadError") }))
      }
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // This form can be opened from the product form: React bubbles submit events through portals
    e.stopPropagation()
    const nextErrors: typeof errors = {}
    if (!name.trim()) nextErrors.name = t("nameRequired")
    if (!slug.trim()) nextErrors.slug = t("slugRequired")
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      const res = await fetch(brand ? `/api/brands/${brand.id}` : "/api/brands", {
        method: brand ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, logo_url: logoUrl || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        const field = data.field === "name" || data.field === "slug" ? data.field : "form"
        setErrors({ [field]: data.error || t("saveError") })
        return
      }
      onSaved({ products_count: brand?.products_count ?? 0, ...data })
    } catch {
      setErrors({ form: t("saveError") })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="brand-name">{t("name")} *</Label>
        <Input
          id="brand-name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder={t("namePlaceholder")}
          aria-invalid={!!errors.name}
          autoFocus
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="brand-slug">{t("slug")} *</Label>
        <Input
          id="brand-slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(e.target.value)
          }}
          placeholder="samsung"
          aria-invalid={!!errors.slug}
        />
        {errors.slug ? (
          <p className="text-sm text-destructive">{errors.slug}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{t("slugHint")}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>{t("logo")}</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoUpload}
        />
        {logoUrl ? (
          <div className="flex items-center gap-3">
            <div className="flex size-20 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              <img src={logoUrl} alt="" className="size-full object-contain" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading && <Spinner className="mr-1" />}
                {tc("edit")}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setLogoUrl("")}>
                {tc("delete")}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 py-6 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted hover:text-foreground"
          >
            {uploading ? (
              <div className="flex items-center gap-2 text-sm">
                <Spinner />
                {tc("loading")}
              </div>
            ) : (
              <>
                <span className="text-sm font-medium">{t("uploadLogo")}</span>
                <span className="text-xs">{t("uploadLogoHint")}</span>
              </>
            )}
          </button>
        )}
      </div>
      {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={saving || uploading}>
          {saving && <Spinner className="mr-1" />}
          {brand ? t("updateBrand") : t("createBrand")}
        </Button>
      </DialogFooter>
    </form>
  )
}
