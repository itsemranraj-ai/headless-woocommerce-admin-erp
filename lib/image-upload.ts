/**
 * Image upload utility for FixionFuel Admin.
 * Handles uploading local image buffers/base64 strings to public CDN
 * so WooCommerce can ingest them into WordPress wp-content/uploads/.
 */

async function uploadToLitterbox(blob: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("time", "24h");
  form.append("fileToUpload", blob, filename);

  const res = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", {
    method: "POST",
    body: form,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });
  const text = await res.text();
  if (text.startsWith("http://") || text.startsWith("https://")) {
    return text.trim();
  }
  throw new Error(`Litterbox error: ${text}`);
}

async function uploadToCatbox(blob: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", blob, filename);

  const res = await fetch("https://catbox.moe/user/api.php", {
    method: "POST",
    body: form,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });
  const text = await res.text();
  if (text.startsWith("http://") || text.startsWith("https://")) {
    return text.trim();
  }
  throw new Error(`Catbox error: ${text}`);
}

/**
 * Uploads a base64 image data URL or raw buffer to public CDN/temporary host.
 */
export async function uploadImageToCdn(
  dataUrlOrBuffer: string | Buffer,
  filename: string = "product_image.png"
): Promise<string> {
  let fileBuffer: Buffer;
  let mimeType = "image/png";

  if (typeof dataUrlOrBuffer === "string") {
    const trimmed = dataUrlOrBuffer.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }

    if (trimmed.includes(";base64,")) {
      const parts = trimmed.split(";base64,");
      const mimeMatch = parts[0].match(/data:([^;]+)/);
      if (mimeMatch) mimeType = mimeMatch[1];
      fileBuffer = Buffer.from(parts[1], "base64");
    } else {
      fileBuffer = Buffer.from(trimmed, "base64");
    }
  } else {
    fileBuffer = dataUrlOrBuffer;
  }

  const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  const finalFilename = `ff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });

  // 1. Try Litterbox
  try {
    return await uploadToLitterbox(blob, finalFilename);
  } catch (e1) {
    console.warn("Litterbox upload failed, trying Catbox fallback...", e1);
  }

  // 2. Fallback to Catbox
  try {
    return await uploadToCatbox(blob, finalFilename);
  } catch (e2) {
    console.error("All upload providers failed:", e2);
    throw new Error("Failed to upload image to CDN.");
  }
}
