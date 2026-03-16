import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const ext = file.name.split(".").pop() || "png"
  const fileName = `${crypto.randomUUID()}.${ext}`
  const filePath = `products/${fileName}`

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.find((b) => b.name === "product-images")) {
    await supabase.storage.createBucket("product-images", { public: true })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(filePath, buffer, {
      contentType: file.type || "image/png",
      upsert: false,
    })

  if (uploadError) {
    console.error("Upload error:", uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(filePath)

  return NextResponse.json({ url: urlData.publicUrl })
}
