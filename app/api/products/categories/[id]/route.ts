import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { woocommerceService, WooCommerceApiError } from "@/services/woocommerce";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const categoryId = parseInt(id, 10);
  if (!categoryId || isNaN(categoryId)) {
    return NextResponse.json(
      { success: false, error: { code: "invalid_id", message: "Valid category ID required." } },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const updated = await woocommerceService.updateProductCategory(categoryId, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof WooCommerceApiError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode || 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "internal_error", message: "Failed to update category." } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const categoryId = parseInt(id, 10);
  if (!categoryId || isNaN(categoryId)) {
    return NextResponse.json(
      { success: false, error: { code: "invalid_id", message: "Valid category ID required." } },
      { status: 400 }
    );
  }

  try {
    const result = await woocommerceService.deleteProductCategory(categoryId, true);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof WooCommerceApiError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode || 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "internal_error", message: "Failed to delete category." } },
      { status: 500 }
    );
  }
}
