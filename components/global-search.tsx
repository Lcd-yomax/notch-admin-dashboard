"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  IconBox,
  IconCategory,
  IconSearch,
  IconShoppingCart,
  IconStar,
  IconUsers,
  IconUserShield,
  IconBellRinging,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"

type SearchResult = {
  id: string
  label: string
  description?: string
}

type SearchResults = {
  products: SearchResult[]
  categories: SearchResult[]
  orders: SearchResult[]
  reviews: SearchResult[]
  users: SearchResult[]
  roles: SearchResult[]
  announcements: SearchResult[]
}

const entityConfig = [
  {
    key: "products" as const,
    labelKey: "products" as const,
    icon: IconBox,
    path: "/dashboard/products",
    searchFields: ["name", "slug", "sku"],
    mapItem: (item: Record<string, unknown>) => ({
      id: String(item.id),
      label: String(item.name || ""),
      description: item.sku ? `SKU: ${item.sku}` : undefined,
    }),
  },
  {
    key: "categories" as const,
    labelKey: "categories" as const,
    icon: IconCategory,
    path: "/dashboard/categories",
    searchFields: ["name", "slug"],
    mapItem: (item: Record<string, unknown>) => ({
      id: String(item.id),
      label: String(item.name || ""),
    }),
  },
  {
    key: "orders" as const,
    labelKey: "orders" as const,
    icon: IconShoppingCart,
    path: "/dashboard/orders",
    searchFields: ["order_number", "full_name", "email", "phone", "city", "address", "status"],
    mapItem: (item: Record<string, unknown>) => ({
      id: String(item.id),
      label: `#${item.order_number} — ${item.full_name}`,
      description: [item.phone, item.city, item.status].filter(Boolean).join(" · "),
    }),
  },
  {
    key: "reviews" as const,
    labelKey: "reviews" as const,
    icon: IconStar,
    path: "/dashboard/reviews",
    searchFields: ["reviewer_name", "user_name", "comment"],
    mapItem: (item: Record<string, unknown>) => ({
      id: String(item.id),
      label: String(item.reviewer_name || item.user_name || `Review #${item.id}`),
      description: item.rating ? `${item.rating}★` : undefined,
    }),
  },
  {
    key: "users" as const,
    labelKey: "users" as const,
    icon: IconUsers,
    path: "/dashboard/users",
    searchFields: ["full_name", "email"],
    mapItem: (item: Record<string, unknown>) => ({
      id: String(item.id),
      label: String(item.full_name || item.email || ""),
      description: item.email && item.full_name ? String(item.email) : undefined,
    }),
  },
  {
    key: "roles" as const,
    labelKey: "rolesPermissions" as const,
    icon: IconUserShield,
    path: "/dashboard/roles",
    searchFields: ["name", "description"],
    mapItem: (item: Record<string, unknown>) => ({
      id: String(item.id),
      label: String(item.name || ""),
    }),
  },
  {
    key: "announcements" as const,
    labelKey: "announcements" as const,
    icon: IconBellRinging,
    path: "/dashboard/announcements",
    searchFields: ["title", "body"],
    mapItem: (item: Record<string, unknown>) => ({
      id: String(item.id),
      label: String(item.title || ""),
    }),
  },
]

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResults | null>(null)
  const [isSearching, setIsSearching] = React.useState(false)
  const router = useRouter()
  const t = useTranslations("search")
  const tNav = useTranslations("nav")
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>(null)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setResults(null)
    }
  }, [open])

  React.useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const fetches = entityConfig.map(async (entity) => {
          try {
            const res = await fetch(`/api/${entity.key}`)
            if (!res.ok) return { key: entity.key, items: [] }
            const data = await res.json()
            const items = Array.isArray(data) ? data : data.data ?? []
            const q = query.toLowerCase()
            const filtered = items
              .filter((raw: Record<string, unknown>) =>
                entity.searchFields.some((field) =>
                  String(raw[field] ?? "").toLowerCase().includes(q)
                )
              )
              .slice(0, 5)
              .map(entity.mapItem)
            return { key: entity.key, items: filtered }
          } catch {
            return { key: entity.key, items: [] }
          }
        })

        const allResults = await Promise.all(fetches)
        const resultMap = {} as SearchResults
        for (const r of allResults) {
          resultMap[r.key as keyof SearchResults] = r.items
        }
        setResults(resultMap)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const handleSelect = (path: string) => {
    setOpen(false)
    router.push(path)
  }

  const hasResults =
    results &&
    Object.values(results).some((items) => items.length > 0)

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 sm:w-60 sm:justify-start sm:px-3 sm:py-2"
        onClick={() => setOpen(true)}
      >
        <IconSearch className="size-4 sm:mr-2" />
        <span className="hidden sm:inline-flex text-muted-foreground">
          {t("placeholder")}
        </span>
        <Kbd className="pointer-events-none hidden sm:inline-flex absolute right-2 top-1/2 -translate-y-1/2">
          ⌘K
        </Kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={t("commandPlaceholder")}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {!query.trim() && (
            <CommandEmpty>{t("typeToSearch")}</CommandEmpty>
          )}
          {query.trim() && !isSearching && !hasResults && (
            <CommandEmpty>{t("noResults")}</CommandEmpty>
          )}
          {isSearching && (
            <CommandEmpty>{t("searching")}</CommandEmpty>
          )}
          {results &&
            entityConfig.map((entity) => {
              const items = results[entity.key]
              if (!items || items.length === 0) return null
              const Icon = entity.icon
              return (
                <CommandGroup key={entity.key} heading={tNav(entity.labelKey)}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      onSelect={() => handleSelect(
                        entity.key === "orders"
                          ? `${entity.path}/${item.id}`
                          : entity.path
                      )}
                      value={`${entity.key}-${item.label}`}
                    >
                      <Icon className="mr-2 size-4" />
                      <span>{item.label}</span>
                      {item.description && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })}
        </CommandList>
      </CommandDialog>
    </>
  )
}
