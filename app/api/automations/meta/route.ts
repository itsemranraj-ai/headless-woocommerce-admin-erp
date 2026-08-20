import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getEmailTemplates } from "@/lib/email/email-store";
import { getWhatsAppTemplates } from "@/lib/whatsapp/whatsapp-store";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const emailTemplates = getEmailTemplates().map((t) => ({ id: t.id, name: t.name, scenario: t.scenario }));
  const whatsappTemplates = getWhatsAppTemplates().map((t) => ({ id: t.id, name: t.name, scenario: t.scenario }));

  const triggers = [
    { value: "order.created", label: "📦 Order Created", group: "Order Triggers" },
    { value: "order.status_changed", label: "🔄 Order Status Changed", group: "Order Triggers" },
    { value: "order.processing", label: "⚙️ Order Processing", group: "Order Triggers" },
    { value: "order.completed", label: "✓ Order Completed", group: "Order Triggers" },
    { value: "order.cancelled", label: "✕ Order Cancelled", group: "Order Triggers" },
    { value: "order.refunded", label: "↩ Order Refunded", group: "Order Triggers" },
    { value: "payment.completed", label: "💳 Payment Completed", group: "Order Triggers" },
    { value: "payment.failed", label: "⚠️ Payment Failed", group: "Order Triggers" },
    { value: "product.created", label: "🆕 Product Created", group: "Product Triggers" },
    { value: "product.updated", label: "📝 Product Updated", group: "Product Triggers" },
    { value: "product.stock_changed", label: "📊 Stock Changed", group: "Product Triggers" },
    { value: "product.low_stock", label: "📉 Low Stock Alert", group: "Product Triggers" },
    { value: "product.out_of_stock", label: "🚨 Out of Stock Alert", group: "Product Triggers" },
    { value: "customer.created", label: "👤 Customer Created", group: "Customer Triggers" },
    { value: "customer.updated", label: "👤 Customer Updated", group: "Customer Triggers" },
  ];

  const conditionFields = [
    { value: "order_total", label: "Order Total ($)", type: "number", group: "Order" },
    { value: "order_subtotal", label: "Order Subtotal ($)", type: "number", group: "Order" },
    { value: "order_status", label: "Order Status", type: "string", group: "Order" },
    { value: "payment_method", label: "Payment Method", type: "string", group: "Order" },
    { value: "shipping_method", label: "Shipping Method", type: "string", group: "Order" },
    { value: "coupon", label: "Coupon Code", type: "string", group: "Order" },
    { value: "customer_name", label: "Customer Name", type: "string", group: "Customer" },
    { value: "customer_email", label: "Customer Email", type: "string", group: "Customer" },
    { value: "customer_phone", label: "Customer Phone", type: "string", group: "Customer" },
    { value: "customer_country", label: "Customer Country (e.g. US, UK)", type: "string", group: "Customer" },
    { value: "customer_city", label: "Customer City", type: "string", group: "Customer" },
    { value: "product_name", label: "Product Name", type: "string", group: "Product" },
    { value: "sku", label: "Product SKU", type: "string", group: "Product" },
    { value: "price", label: "Product Price ($)", type: "number", group: "Product" },
    { value: "stock_quantity", label: "Stock Quantity", type: "number", group: "Product" },
    { value: "stock_status", label: "Stock Status (instock / outofstock)", type: "string", group: "Product" },
    { value: "quantity", label: "Item Quantity Ordered", type: "number", group: "Order" },
  ];

  const operators = [
    { value: "equals", label: "Equals (=)" },
    { value: "not_equals", label: "Does Not Equal (≠)" },
    { value: "greater_than", label: "Greater Than (>)" },
    { value: "less_than", label: "Less Than (<)" },
    { value: "greater_than_or_equal", label: "Greater Than or Equal (≥)" },
    { value: "less_than_or_equal", label: "Less Than or Equal (≤)" },
    { value: "contains", label: "Contains text" },
    { value: "does_not_contain", label: "Does not contain text" },
    { value: "is_empty", label: "Is Empty" },
    { value: "is_not_empty", label: "Is Not Empty" },
  ];

  return NextResponse.json({
    success: true,
    data: {
      triggers,
      conditionFields,
      operators,
      emailTemplates,
      whatsappTemplates,
    },
  });
}
