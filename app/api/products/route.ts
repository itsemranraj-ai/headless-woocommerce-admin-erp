import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  woocommerceService,
  WooCommerceConfigError,
  WooCommerceApiError,
} from "@/services/woocommerce";
import { CreateProductPayload } from "@/types";
import { uploadImageToCdn } from "@/lib/image-upload";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required to access products." } },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get("diag") === "1") {
      const key = process.env.WOOCOMMERCE_CONSUMER_KEY || "ck_81feadcfea9035a0e43ece826b0b973a0f75dbfe";
      const secret = process.env.WOOCOMMERCE_CONSUMER_SECRET || "cs_6ad11d2d510d554139f7e757cf4ae98dcf8b3b5f";
      const auth = "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
      const targetUrl = "https://fixionfuel.shop/wp-json/wc/v3/products?page=1&per_page=10";

      try {
        const rawRes = await fetch(targetUrl, {
          headers: {
            Authorization: auth,
            "User-Agent": "FixionFuelAdmin/1.0",
            Accept: "application/json",
          },
          cache: "no-store",
        });
        const rawText = await rawRes.text();
        return NextResponse.json({
          diag: true,
          status: rawRes.status,
          statusText: rawRes.statusText,
          headers: Object.fromEntries(rawRes.headers.entries()),
          bodyPreview: rawText.slice(0, 500),
          env: {
            keyPrefix: key.slice(0, 8),
            secretPrefix: secret.slice(0, 8),
            apiUrl: process.env.WOOCOMMERCE_API_URL || "default",
          },
        });
      } catch (rawErr) {
        return NextResponse.json({
          diag: true,
          error: rawErr instanceof Error ? rawErr.message : String(rawErr),
          stack: rawErr instanceof Error ? rawErr.stack : undefined,
        });
      }
    }

    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = parseInt(searchParams.get("per_page") || "15", 10);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const stockStatus = searchParams.get("stock_status") || undefined;
    const type = searchParams.get("type") || undefined;
    const status = searchParams.get("status") || undefined;

    const result = await woocommerceService.getProducts({
      page,
      perPage,
      search,
      category,
      stock_status: stockStatus,
      type,
      status,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof WooCommerceConfigError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "woocommerce_not_configured",
            message: error.message,
          },
        },
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
            message: error.statusCode === 401 || error.statusCode === 403
              ? `WooCommerce REST API rejected credentials: ${error.message} (Please check Consumer Key/Secret in WordPress).`
              : error.message,
            details: error.details,
          },
        },
        { status: httpStatus }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "internal_error",
          message: error instanceof Error ? error.message : "Failed to fetch products.",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required to create products." } },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as CreateProductPayload;

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "validation_error", message: "Product name is required." } },
        { status: 400 }
      );
    }

    const { variations_data, ...productPayload } = body;

    // Preprocess images (convert base64 data URLs to public URLs for WooCommerce)
    if (productPayload.images && Array.isArray(productPayload.images)) {
      const processedImages: Array<{ src: string }> = [];
      for (const img of productPayload.images) {
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
      productPayload.images = processedImages.length > 0 ? processedImages : undefined;
    }

    // Preprocess variations data images
    if (Array.isArray(variations_data)) {
      for (const v of variations_data) {
        if (v.image && v.image.src && typeof v.image.src === "string" && v.image.src.trim()) {
          const cleanSrc = v.image.src.trim();
          if (cleanSrc.startsWith("data:")) {
            try {
              const cdnUrl = await uploadImageToCdn(cleanSrc);
              v.image = { src: cdnUrl };
            } catch (err) {
              console.error("Variation image upload error:", err);
              v.image = undefined;
            }
          }
        }
      }
    }

    // 1. Create main product on WooCommerce
    const newProduct = await woocommerceService.createProduct(productPayload);

    // 2. If variable product with variations data, batch create them
    if (newProduct.id && body.type === "variable" && Array.isArray(variations_data) && variations_data.length > 0) {
      try {
        await woocommerceService.batchProductVariations(newProduct.id, {
          create: variations_data,
        });
      } catch (varErr) {
        console.error("Variation batch creation warning:", varErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: newProduct,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof WooCommerceConfigError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "woocommerce_not_configured",
            message: error.message,
          },
        },
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
            message: error.statusCode === 401 || error.statusCode === 403
              ? `WooCommerce REST API rejected credentials: ${error.message} (Please check Consumer Key/Secret in WordPress).`
              : error.message,
            details: error.details,
          },
        },
        { status: httpStatus }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "internal_error",
          message: error instanceof Error ? error.message : "Failed to create product.",
        },
      },
      { status: 500 }
    );
  }
}
