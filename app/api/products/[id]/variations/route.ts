import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { woocommerceService, WooCommerceApiError } from "@/services/woocommerce";
import { CreateVariationPayload } from "@/types";
import { uploadImageToCdn } from "@/lib/image-upload";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    return NextResponse.json(
      { success: false, error: { code: "invalid_id", message: "Invalid product ID." } },
      { status: 400 }
    );
  }

  try {
    const variations = await woocommerceService.getProductVariations(productId);
    return NextResponse.json({ success: true, data: variations });
  } catch (error) {
    if (error instanceof WooCommerceApiError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode || 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "internal_error", message: "Failed to fetch variations." } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    return NextResponse.json(
      { success: false, error: { code: "invalid_id", message: "Invalid product ID." } },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as CreateVariationPayload;
    if (body.image && body.image.src && typeof body.image.src === "string" && body.image.src.trim().startsWith("data:")) {
      try {
        const cdnUrl = await uploadImageToCdn(body.image.src.trim());
        body.image = { src: cdnUrl };
      } catch {
        body.image = undefined;
      }
    }
    const variation = await woocommerceService.createProductVariation(productId, body);
    return NextResponse.json({ success: true, data: variation }, { status: 201 });
  } catch (error) {
    if (error instanceof WooCommerceApiError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode || 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "internal_error", message: "Failed to create variation." } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    return NextResponse.json(
      { success: false, error: { code: "invalid_id", message: "Invalid product ID." } },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();

    if (body.update && Array.isArray(body.update)) {
      for (const v of body.update) {
        if (v.image && v.image.src && typeof v.image.src === "string" && v.image.src.trim().startsWith("data:")) {
          try {
            const cdnUrl = await uploadImageToCdn(v.image.src.trim());
            v.image = { src: cdnUrl };
          } catch {
            v.image = undefined;
          }
        }
      }
    }

    if (body.create && Array.isArray(body.create)) {
      for (const v of body.create) {
        if (v.image && v.image.src && typeof v.image.src === "string" && v.image.src.trim().startsWith("data:")) {
          try {
            const cdnUrl = await uploadImageToCdn(v.image.src.trim());
            v.image = { src: cdnUrl };
          } catch {
            v.image = undefined;
          }
        }
      }
    }

    const result = await woocommerceService.batchProductVariations(productId, body);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof WooCommerceApiError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode || 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "internal_error", message: "Failed to batch update variations." } },
      { status: 500 }
    );
  }
}
