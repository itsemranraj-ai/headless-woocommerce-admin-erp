import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  woocommerceService,
  WooCommerceConfigError,
  WooCommerceApiError,
} from "@/services/woocommerce";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  if (!query.trim()) {
    return NextResponse.json({
      success: true,
      data: [],
    });
  }

  try {
    const products = await woocommerceService.searchProducts(query);
    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error) {
    if (error instanceof WooCommerceConfigError) {
      return NextResponse.json(
        { success: false, error: { code: "woocommerce_not_configured", message: error.message } },
        { status: 503 }
      );
    }

    if (error instanceof WooCommerceApiError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: "internal_error", message: "Failed to search products." } },
      { status: 500 }
    );
  }
}
