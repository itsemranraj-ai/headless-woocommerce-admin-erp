import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  woocommerceService,
  WooCommerceConfigError,
  WooCommerceApiError,
} from "@/services/woocommerce";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const categories = await woocommerceService.getProductCategories();
    return NextResponse.json({
      success: true,
      data: categories,
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
      { success: false, error: { code: "internal_error", message: "Failed to fetch categories." } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "validation_error", message: "Category name is required." } },
        { status: 400 }
      );
    }

    const category = await woocommerceService.createProductCategory(
      body.name.trim(),
      body.parent ? Number(body.parent) : 0,
      body.description,
      body.slug,
      body.image
    );
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    if (error instanceof WooCommerceApiError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode || 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "internal_error", message: "Failed to create category." } },
      { status: 500 }
    );
  }
}
