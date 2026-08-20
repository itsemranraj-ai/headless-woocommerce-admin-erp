import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAutomationRuleById } from "@/lib/automations/automation-store";
import { automationEngine } from "@/services/automation-engine";
import { woocommerceService } from "@/services/woocommerce";

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
    const { ruleId, orderId, customTotal, customStock } = body;

    if (!ruleId) {
      return NextResponse.json(
        { success: false, error: { code: "missing_rule", message: "ruleId is required." } },
        { status: 400 }
      );
    }

    const rule = getAutomationRuleById(ruleId);
    if (!rule) {
      return NextResponse.json(
        { success: false, error: { code: "not_found", message: "Automation rule not found." } },
        { status: 404 }
      );
    }

    // 1. Fetch real order if ID provided, or create mock order
    let mockOrderData: any = {
      id: orderId ? Number(orderId) : 1058,
      number: orderId ? String(orderId) : "1058",
      total: customTotal !== undefined ? customTotal : "245.00",
      status: rule.trigger.replace("order.", "") || "processing",
      date_created: new Date().toISOString(),
      billing: {
        first_name: "Alexander",
        last_name: "Wright",
        email: "alexander@example.com",
        phone: "+1 (555) 234-5678",
        country: "US",
      },
      line_items: [
        {
          id: 1,
          name: "Kisspeptin 10mg & HGH 191aa Pack",
          quantity: 2,
          price: "122.50",
        },
      ],
      meta_data: [{ key: "_tracking_number", value: "USPS-9400111899562537468219" }],
    };

    if (orderId && Number(orderId) > 0) {
      try {
        const liveOrder = await woocommerceService.getOrderById(Number(orderId));
        if (liveOrder && liveOrder.id) {
          mockOrderData = liveOrder;
        }
      } catch {
        // Use default mock order
      }
    }

    // 2. Mock product data for stock rules
    const mockProductData: any = {
      id: 842,
      name: "Kisspeptin 10mg",
      stock_quantity: customStock !== undefined ? Number(customStock) : 2,
      stock_status: "instock",
      price: 42.0,
    };

    // 3. Run safe dry-run simulation
    const log = await automationEngine.simulateRule(rule, {
      orderData: mockOrderData,
      productData: mockProductData,
    });

    return NextResponse.json({
      success: true,
      data: log,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "simulation_error", message: err instanceof Error ? err.message : "Simulation execution failed." },
      },
      { status: 500 }
    );
  }
}
