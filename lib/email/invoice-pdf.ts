import { Order } from "@/types";

/**
 * Pure Node.js Standard PDF-1.4 Invoice Generator for FixionFuel.
 * Creates clean, universally-compatible PDF binary buffers with zero external dependencies.
 */

function escapePdfText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function generateInvoicePdf(order: Order): Buffer {
  const orderId = String(order.id || order.number || "0");
  const invoiceNumber = `INV-${orderId}`;
  const orderDate = order.date_created
    ? new Date(order.date_created).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

  const customerName =
    `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() ||
    `${order.shipping?.first_name || ""} ${order.shipping?.last_name || ""}`.trim() ||
    "Valued Customer";

  const customerEmail = order.billing?.email || "N/A";
  const customerPhone = order.billing?.phone || "N/A";
  const paymentMethod = order.payment_method_title || order.payment_method || "Direct Payment";

  const billingAddress = [
    order.billing?.address_1,
    order.billing?.address_2,
    order.billing?.city,
    order.billing?.state,
    order.billing?.postcode,
    order.billing?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const shippingAddress =
    [
      order.shipping?.address_1,
      order.shipping?.address_2,
      order.shipping?.city,
      order.shipping?.state,
      order.shipping?.postcode,
      order.shipping?.country,
    ]
      .filter(Boolean)
      .join(", ") || billingAddress;

  const lineItems = Array.isArray(order.line_items) ? order.line_items : [];

  // PDF drawing commands (A4: 595.28 x 841.89 points)
  // Origin (0,0) is bottom-left
  const commands: string[] = [];

  // Helper to add text
  const addText = (
    text: string,
    x: number,
    y: number,
    font: "F1" | "F2" = "F1",
    size: number = 10,
    r: number = 0.1,
    g: number = 0.1,
    b: number = 0.1
  ) => {
    commands.push(`BT /${font} ${size} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(text)}) Tj ET`);
  };

  // Helper to draw filled rectangle
  const fillRect = (x: number, y: number, w: number, h: number, r: number, g: number, b: number) => {
    commands.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  };

  // Helper to draw stroked rectangle
  const strokeRect = (x: number, y: number, w: number, h: number, r: number, g: number, b: number, lineWidth: number = 1) => {
    commands.push(`${lineWidth} w ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
  };

  // Helper to draw line
  const drawLine = (x1: number, y1: number, x2: number, y2: number, r: number = 0.85, g: number = 0.85, b: number = 0.85, w: number = 1) => {
    commands.push(`${w} w ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  };

  // 1. Top Header Banner (Dark Charcoal)
  fillRect(0, 755, 595.28, 90, 0.094, 0.094, 0.106); // #18181b
  addText("FIXIONFUEL", 40, 805, "F2", 22, 1, 1, 1);
  addText("Official Order Invoice & Receipt", 40, 785, "F1", 10, 0.75, 0.75, 0.78);
  addText("https://fixionfuel.shop", 40, 770, "F1", 9, 0.55, 0.55, 0.6);

  // Status Badge in Header
  fillRect(440, 780, 115, 26, 0.086, 0.639, 0.290); // Emerald green
  addText("COMPLETED", 460, 789, "F2", 11, 1, 1, 1);

  // 2. Invoice Meta Details Bar
  fillRect(40, 690, 515.28, 50, 0.965, 0.965, 0.975);
  strokeRect(40, 690, 515.28, 50, 0.9, 0.9, 0.92, 1);

  addText("INVOICE NO:", 55, 722, "F2", 8, 0.45, 0.45, 0.5);
  addText(invoiceNumber, 55, 706, "F2", 11, 0.1, 0.1, 0.1);

  addText("ORDER NO:", 185, 722, "F2", 8, 0.45, 0.45, 0.5);
  addText(`#${orderId}`, 185, 706, "F2", 11, 0.1, 0.1, 0.1);

  addText("ORDER DATE:", 305, 722, "F2", 8, 0.45, 0.45, 0.5);
  addText(orderDate, 305, 706, "F1", 10, 0.1, 0.1, 0.1);

  addText("PAYMENT METHOD:", 420, 722, "F2", 8, 0.45, 0.45, 0.5);
  addText(paymentMethod.substring(0, 18), 420, 706, "F1", 10, 0.1, 0.1, 0.1);

  // 3. Customer Info Cards (Bill To & Ship To)
  // Bill To Box
  fillRect(40, 580, 248, 95, 0.985, 0.985, 0.99);
  strokeRect(40, 580, 248, 95, 0.88, 0.88, 0.9, 1);
  addText("CUSTOMER / BILL TO", 52, 658, "F2", 9, 0.15, 0.15, 0.2);
  addText(customerName.substring(0, 32), 52, 642, "F2", 10, 0.1, 0.1, 0.1);
  addText(`Email: ${customerEmail.substring(0, 30)}`, 52, 627, "F1", 8.5, 0.35, 0.35, 0.4);
  addText(`Phone: ${customerPhone.substring(0, 25)}`, 52, 613, "F1", 8.5, 0.35, 0.35, 0.4);
  addText(billingAddress.substring(0, 38), 52, 597, "F1", 8, 0.45, 0.45, 0.5);

  // Ship To Box
  fillRect(307, 580, 248, 95, 0.985, 0.985, 0.99);
  strokeRect(307, 580, 248, 95, 0.88, 0.88, 0.9, 1);
  addText("SHIPPING ADDRESS", 319, 658, "F2", 9, 0.15, 0.15, 0.2);
  addText(customerName.substring(0, 32), 319, 642, "F2", 10, 0.1, 0.1, 0.1);
  addText(shippingAddress.substring(0, 42), 319, 627, "F1", 8.5, 0.35, 0.35, 0.4);
  if (shippingAddress.length > 42) {
    addText(shippingAddress.substring(42, 84), 319, 613, "F1", 8.5, 0.35, 0.35, 0.4);
  }
  addText("Delivery Status: Dispatched / Delivered", 319, 597, "F2", 8, 0.086, 0.639, 0.290);

  // 4. Line Items Table
  let currentY = 535;

  // Table Header
  fillRect(40, currentY, 515.28, 24, 0.15, 0.15, 0.18);
  addText("ITEM DESCRIPTION", 55, currentY + 7, "F2", 9, 1, 1, 1);
  addText("QTY", 370, currentY + 7, "F2", 9, 1, 1, 1);
  addText("UNIT PRICE", 425, currentY + 7, "F2", 9, 1, 1, 1);
  addText("TOTAL", 505, currentY + 7, "F2", 9, 1, 1, 1);

  currentY -= 26;

  // Render Table Rows
  if (lineItems.length === 0) {
    addText("General Store Item", 55, currentY + 6, "F1", 9, 0.2, 0.2, 0.2);
    addText("1", 375, currentY + 6, "F1", 9, 0.2, 0.2, 0.2);
    addText(`$${order.total || "0.00"}`, 430, currentY + 6, "F1", 9, 0.2, 0.2, 0.2);
    addText(`$${order.total || "0.00"}`, 505, currentY + 6, "F2", 9, 0.1, 0.1, 0.1);
    currentY -= 24;
  } else {
    lineItems.forEach((item, index) => {
      const isAlt = index % 2 === 1;
      if (isAlt) {
        fillRect(40, currentY - 4, 515.28, 22, 0.975, 0.975, 0.985);
      }
      drawLine(40, currentY - 4, 555.28, currentY - 4, 0.92, 0.92, 0.94);

      const itemName = String(item.name || "Item").substring(0, 48);
      const qty = String(item.quantity || 1);
      const unitPrice = parseFloat(String(item.price || item.total || 0)).toFixed(2);
      const lineTotal = parseFloat(String(item.total || (parseFloat(unitPrice) * parseInt(qty, 10)))).toFixed(2);

      addText(itemName, 55, currentY + 3, "F1", 9, 0.15, 0.15, 0.2);
      addText(qty, 375, currentY + 3, "F1", 9, 0.2, 0.2, 0.2);
      addText(`$${unitPrice}`, 430, currentY + 3, "F1", 9, 0.2, 0.2, 0.2);
      addText(`$${lineTotal}`, 505, currentY + 3, "F2", 9, 0.1, 0.1, 0.1);

      currentY -= 24;
    });
  }

  currentY -= 10;

  // 5. Totals Breakdown Card (Right aligned)
  const subtotalVal = parseFloat(String(order.total || "0.00"));
  const shippingVal = parseFloat(String(order.shipping_total || "0.00"));
  const discountVal = parseFloat(String(order.discount_total || "0.00"));
  const grandTotal = parseFloat(String(order.total || "0.00")).toFixed(2);

  const totalsBoxX = 330;
  const totalsBoxW = 225.28;
  const totalsBoxH = 95;
  fillRect(totalsBoxX, currentY - totalsBoxH + 20, totalsBoxW, totalsBoxH, 0.98, 0.98, 0.99);
  strokeRect(totalsBoxX, currentY - totalsBoxH + 20, totalsBoxW, totalsBoxH, 0.88, 0.88, 0.9, 1);

  let totalLineY = currentY + 6;
  addText("Subtotal:", totalsBoxX + 15, totalLineY, "F1", 9, 0.45, 0.45, 0.5);
  addText(`$${subtotalVal.toFixed(2)}`, totalsBoxX + 160, totalLineY, "F1", 9, 0.2, 0.2, 0.2);

  totalLineY -= 18;
  addText("Shipping:", totalsBoxX + 15, totalLineY, "F1", 9, 0.45, 0.45, 0.5);
  addText(shippingVal > 0 ? `$${shippingVal.toFixed(2)}` : "Free Shipping", totalsBoxX + 140, totalLineY, "F1", 8.5, 0.2, 0.2, 0.2);

  if (discountVal > 0) {
    totalLineY -= 18;
    addText("Discount:", totalsBoxX + 15, totalLineY, "F1", 9, 0.8, 0.2, 0.2);
    addText(`-$${discountVal.toFixed(2)}`, totalsBoxX + 155, totalLineY, "F1", 9, 0.8, 0.2, 0.2);
  }

  totalLineY -= 20;
  drawLine(totalsBoxX + 10, totalLineY + 12, totalsBoxX + totalsBoxW - 10, totalLineY + 12, 0.85, 0.85, 0.88);
  addText("GRAND TOTAL:", totalsBoxX + 15, totalLineY, "F2", 10, 0.09, 0.09, 0.1);
  addText(`$${grandTotal} USD`, totalsBoxX + 140, totalLineY, "F2", 11, 0.086, 0.639, 0.290);

  // 6. Security & Verification Note (Left aligned)
  const noteBoxY = currentY - totalsBoxH + 20;
  fillRect(40, noteBoxY, 275, totalsBoxH, 0.97, 0.985, 0.975);
  strokeRect(40, noteBoxY, 275, totalsBoxH, 0.82, 0.92, 0.85, 1);
  addText("PAYMENT VERIFIED & SETTLED", 55, noteBoxY + 75, "F2", 8.5, 0.086, 0.55, 0.25);
  addText("This receipt serves as official proof of payment.", 55, noteBoxY + 58, "F1", 8, 0.35, 0.35, 0.4);
  addText("Your order was fulfilled and synchronized via FixionFuel", 55, noteBoxY + 44, "F1", 8, 0.35, 0.35, 0.4);
  addText("store systems. For support, reply directly to this invoice.", 55, noteBoxY + 30, "F1", 8, 0.35, 0.35, 0.4);
  addText("Support Contact: admin@fixionfuel.shop", 55, noteBoxY + 14, "F2", 8, 0.15, 0.15, 0.2);

  // 7. Page Footer
  drawLine(40, 55, 555.28, 55, 0.88, 0.88, 0.9);
  addText("Thank you for shopping with FixionFuel • https://fixionfuel.shop", 160, 40, "F2", 8.5, 0.45, 0.45, 0.5);
  addText(`Generated on ${new Date().toUTCString()} • Page 1 of 1`, 185, 26, "F1", 7.5, 0.6, 0.6, 0.65);

  // Combine stream
  const contentStream = commands.join("\n");
  const contentStreamLength = Buffer.byteLength(contentStream, "utf-8");

  // Construct PDF Objects
  const pdfObjects: string[] = [];
  pdfObjects.push(
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n`,
    `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`,
    `6 0 obj\n<< /Length ${contentStreamLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`
  );

  const header = `%PDF-1.4\n%\xe2\xe3\xcf\xd3\n`;
  let currentOffset = Buffer.byteLength(header, "utf-8");
  const offsets: number[] = [];

  for (const obj of pdfObjects) {
    offsets.push(currentOffset);
    currentOffset += Buffer.byteLength(obj, "utf-8");
  }

  const startXref = currentOffset;
  let xref = `xref\n0 7\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += String(offset).padStart(10, "0") + " 00000 n \n";
  }

  const trailer = `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  const fullPdfString = header + pdfObjects.join("") + xref + trailer;
  return Buffer.from(fullPdfString, "binary");
}
