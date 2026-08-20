import { NextRequest, NextResponse } from "next/server";
import { uploadImageToCdn } from "@/lib/image-upload";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const { image, filename } = await req.json();
      if (!image) {
        return NextResponse.json({ success: false, error: { message: "No image provided" } }, { status: 400 });
      }
      const cdnUrl = await uploadImageToCdn(image, filename || "upload.png");
      return NextResponse.json({ success: true, url: cdnUrl });
    }

    // Multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: { message: "No file uploaded" } }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const cdnUrl = await uploadImageToCdn(buffer, file.name || "upload.png");

    return NextResponse.json({ success: true, url: cdnUrl });
  } catch (err: unknown) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { success: false, error: { message: err instanceof Error ? err.message : "Failed to upload image" } },
      { status: 500 }
    );
  }
}
