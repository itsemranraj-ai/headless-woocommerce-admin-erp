import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { woocommerceService, WooCommerceApiError } from "@/services/woocommerce";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const tags = await woocommerceService.getProductTags();
    return NextResponse.json({ success: true, data: tags });
  } catch (error) {
    if (error instanceof WooCommerceApiError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode || 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "internal_error", message: "Failed to fetch tags." } },
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
        { success: false, error: { code: "validation_error", message: "Tag name is required." } },
        { status: 400 }
      );
    }

    const tag = await woocommerceService.createProductTag(
      body.name.trim(),
      body.description,
      body.slug
    );
    return NextResponse.json({ success: true, data: tag }, { status: 201 });
  } catch (error) {
    if (error instanceof WooCommerceApiError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode || 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "internal_error", message: "Failed to create tag." } },
      { status: 500 }
    );
  }
}
