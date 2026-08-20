import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  woocommerceService,
  WooCommerceConfigError,
  WooCommerceApiError,
} from "@/services/woocommerce";
import { UpdateProductPayload } from "@/types";
import { uploadImageToCdn } from "@/lib/image-upload";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required to view product." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId) || productId <= 0) {
    return NextResponse.json(
      { success: false, error: { code: "invalid_id", message: "Invalid product ID." } },
      { status: 400 }
    );
  }

  try {
    const product = await woocommerceService.getProductById(productId);

    if (!product) {
      return NextResponse.json(
        { success: false, error: { code: "not_found", message: `Product #${productId} was not found.` } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    if (error instanceof WooCommerceConfigError) {
      return NextResponse.json(
        { success: false, error: { code: "woocommerce_not_configured", message: error.message } },
        { status: 503 }
      );
    }

    if (error instanceof WooCommerceApiError) {
      const httpStatus = error.statusCode === 401 || error.statusCode === 403 ? 502 : (error.statusCode || 500);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.statusCode === 401 || error.statusCode === 403 ? "woocommerce_permission_error" : error.code,
            message: error.message,
          },
        },
        { status: httpStatus }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: "internal_error", message: "Failed to retrieve product." } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required to update product." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId) || productId <= 0) {
    return NextResponse.json(
      { success: false, error: { code: "invalid_id", message: "Invalid product ID." } },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as UpdateProductPayload;

    if (body.images && Array.isArray(body.images)) {
      const processedImages: Array<{ src: string }> = [];
      for (const img of body.images) {
        if (img && img.src && typeof img.src === "string" && img.src.trim()) {
          const cleanSrc = img.src.trim();
          if (cleanSrc.startsWith("data:")) {
            try {
              const cdnUrl = await uploadImageToCdn(cleanSrc);
              processedImages.push({ ...img, src: cdnUrl });
            } catch (err) {
              console.error("Image upload error:", err);
            }
          } else if (cleanSrc.startsWith("http://") || cleanSrc.startsWith("https://")) {
            processedImages.push({ ...img, src: cleanSrc });
          }
        }
      }
      body.images = processedImages.length > 0 ? processedImages : undefined;
    }

    const updatedProduct = await woocommerceService.updateProduct(productId, body);

    return NextResponse.json({
      success: true,
      data: updatedProduct,
    });
  } catch (error) {
    if (error instanceof WooCommerceConfigError) {
      return NextResponse.json(
        { success: false, error: { code: "woocommerce_not_configured", message: error.message } },
        { status: 503 }
      );
    }

    if (error instanceof WooCommerceApiError) {
      const httpStatus = error.statusCode === 401 || error.statusCode === 403 ? 502 : (error.statusCode || 500);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.statusCode === 401 || error.statusCode === 403 ? "woocommerce_permission_error" : error.code,
            message: error.message,
          },
        },
        { status: httpStatus }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: "internal_error", message: "Failed to update product." } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required to delete product." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId) || productId <= 0) {
    return NextResponse.json(
      { success: false, error: { code: "invalid_id", message: "Invalid product ID." } },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  try {
    const result = await woocommerceService.deleteProduct(productId, force);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof WooCommerceConfigError) {
      return NextResponse.json(
        { success: false, error: { code: "woocommerce_not_configured", message: error.message } },
        { status: 503 }
      );
    }

    if (error instanceof WooCommerceApiError) {
      const httpStatus = error.statusCode === 401 || error.statusCode === 403 ? 502 : (error.statusCode || 500);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.statusCode === 401 || error.statusCode === 403 ? "woocommerce_permission_error" : error.code,
            message: error.message,
          },
        },
        { status: httpStatus }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: "internal_error", message: "Failed to delete product." } },
      { status: 500 }
    );
  }
}
