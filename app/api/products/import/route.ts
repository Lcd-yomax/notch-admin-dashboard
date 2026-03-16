import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = createAdminClient()
  const { products } = await request.json()

  if (!Array.isArray(products) || products.length === 0) {
    return NextResponse.json({ error: "No products to import" }, { status: 400 })
  }

  const results = { created: 0, errors: [] as string[] }

  for (const product of products) {
    if (!product.name) {
      results.errors.push(`Skipped row: missing product name`)
      continue
    }

    const slug = product.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")

    // Look up category by name if provided
    let categoryId: string | null = null
    if (product.category) {
      const { data: existingCat } = await supabase
        .from("categories")
        .select("id")
        .eq("name", product.category)
        .single()

      if (existingCat) {
        categoryId = existingCat.id
      } else {
        // Create the category
        const catSlug = product.category
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
        const { data: newCat } = await supabase
          .from("categories")
          .insert({ name: product.category, slug: catSlug })
          .select("id")
          .single()
        if (newCat) categoryId = newCat.id
      }
    }

    const { error } = await supabase
      .from("products")
      .insert({
        name: product.name,
        slug,
        description: product.description || null,
        category_id: categoryId,
        thumbnail_url: product.thumbnail_url || null,
        is_active: true,
        is_featured: false,
        is_best_seller: false,
      })

    if (error) {
      results.errors.push(`"${product.name}": ${error.message}`)
    } else {
      results.created++
    }
  }

  return NextResponse.json(results)
}
