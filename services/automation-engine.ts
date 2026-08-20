import {
  ActionExecutionResult,
  AutomationExecutionLog,
  AutomationTrigger,
  AutomationRule,
} from "@/types/automation";
import { getAutomationRules, getRulesByTrigger } from "@/lib/automations/automation-store";
import { evaluateConditions } from "@/lib/automations/condition-evaluator";
import { isEventProcessed, markEventProcessed } from "@/lib/automations/deduplication";
import { logAutomationExecution } from "@/lib/automations/automation-log-store";
import { emailService } from "@/services/email-service";
import { whatsappService } from "@/services/whatsapp-service";
import { notificationService } from "@/services/notifications";
import { Order, Product } from "@/types";

export interface AutomationEventPayload {
  trigger: AutomationTrigger;
  eventId?: string;
  orderData?: Partial<Order> & Record<string, unknown>;
  productData?: Partial<Product> & Record<string, unknown>;
  customerData?: Record<string, unknown>;
  variables?: Record<string, string | number | boolean | undefined | null>;
  isSimulation?: boolean;
}

export class AutomationEngine {
  /**
   * Main entrypoint for processing WooCommerce and store events.
   * Finds matching active automations, evaluates conditions (AND/OR), and executes configured actions with failure isolation.
   */
  async processEvent(payload: AutomationEventPayload): Promise<AutomationExecutionLog[]> {
    const results: AutomationExecutionLog[] = [];

    // 1. Event Deduplication Check (for non-simulation events)
    if (!payload.isSimulation && payload.eventId) {
      if (isEventProcessed(payload.eventId)) {
        console.debug(`[AutomationEngine] Skipping duplicate event: ${payload.eventId}`);
        return [];
      }
      markEventProcessed(payload.eventId);
    }

    // 2. Find matching active automations for this trigger
    const matchingRules = getRulesByTrigger(payload.trigger);

    if (matchingRules.length === 0) {
      return [];
    }

    // 3. Prepare Evaluation Context
    const contextData = this.buildContextData(payload);

    // 4. Process each matching rule independently
    for (const rule of matchingRules) {
      const ruleStartTime = Date.now();

      // Check conditions with AND / OR match logic
      const conditionResult = evaluateConditions(rule.conditions, contextData, rule.matchLogic || "AND");

      if (!conditionResult.matched) {
        const log = logAutomationExecution({
          ruleId: rule.id,
          ruleName: rule.name,
          trigger: payload.trigger,
          eventId: payload.eventId,
          orderId: contextData.order_id ? Number(contextData.order_id) : undefined,
          orderNumber: contextData.order_id ? String(contextData.order_id) : undefined,
          productId: contextData.product_id ? Number(contextData.product_id) : undefined,
          productName: contextData.product_name ? String(contextData.product_name) : undefined,
          conditionsMatched: false,
          conditionEvaluations: conditionResult.evaluations,
          actionResults: [],
          overallStatus: "condition_unmatched",
          durationMs: Date.now() - ruleStartTime,
          isSimulation: payload.isSimulation,
        });
        results.push(log);
        continue;
      }

      // Execute Actions with Failure Isolation
      const actionResults: ActionExecutionResult[] = [];

      for (const action of rule.actions) {
        const actionStart = Date.now();
        try {
          if (payload.isSimulation) {
            // Safe dry-run simulation: Never send real customer messages
            actionResults.push({
              actionType: action.type,
              status: "success",
              recipient: String(contextData.customer_email || contextData.customer_phone || "Admin Devices"),
              messageId: `sim_${Date.now()}`,
              executionDurationMs: Date.now() - actionStart,
            });
            continue;
          }

          if (action.type === "send_email") {
            const recipientEmail = action.recipientOverride || String(contextData.customer_email || "");
            if (!recipientEmail || !recipientEmail.includes("@")) {
              actionResults.push({
                actionType: "send_email",
                status: "failed",
                error: "No valid recipient email available in event context.",
                executionDurationMs: Date.now() - actionStart,
              });
            } else {
              const res = await emailService.sendEmail({
                to: recipientEmail,
                scenario: action.scenario as any,
                templateId: action.templateId,
                orderData: payload.orderData,
                variables: payload.variables,
              });
              actionResults.push({
                actionType: "send_email",
                status: res.success ? "success" : "failed",
                recipient: recipientEmail,
                messageId: res.messageId,
                error: res.error,
                executionDurationMs: Date.now() - actionStart,
              });
            }
          } else if (action.type === "send_whatsapp") {
            const recipientPhone = action.recipientOverride || String(contextData.customer_phone || "");
            if (!recipientPhone) {
              actionResults.push({
                actionType: "send_whatsapp",
                status: "failed",
                error: "No recipient phone number found in event context.",
                executionDurationMs: Date.now() - actionStart,
              });
            } else {
              const res = await whatsappService.sendMessage({
                to: recipientPhone,
                scenario: action.scenario as any,
                templateId: action.templateId,
                orderData: payload.orderData,
                variables: payload.variables,
              });
              actionResults.push({
                actionType: "send_whatsapp",
                status: res.success ? "success" : "failed",
                recipient: recipientPhone,
                messageId: res.messageId,
                error: res.error,
                executionDurationMs: Date.now() - actionStart,
              });
            }
          } else if (action.type === "send_admin_notification") {
            if (payload.orderData) {
              try {
                await notificationService.broadcastOrderNotification(
                  payload.orderData as Order,
                  payload.trigger === "order.created" ? "created" : "updated"
                );
                actionResults.push({
                  actionType: "send_admin_notification",
                  status: "success",
                  recipient: "Admin Portal Devices",
                  executionDurationMs: Date.now() - actionStart,
                });
              } catch (e: unknown) {
                actionResults.push({
                  actionType: "send_admin_notification",
                  status: "failed",
                  error: e instanceof Error ? e.message : "Failed to broadcast admin push notification.",
                  executionDurationMs: Date.now() - actionStart,
                });
              }
            } else {
              actionResults.push({
                actionType: "send_admin_notification",
                status: "success",
                recipient: "Admin Portal Devices",
                executionDurationMs: Date.now() - actionStart,
              });
            }
          }
        } catch (actionErr: unknown) {
          // Failure Isolation: Error in one action never halts other actions
          actionResults.push({
            actionType: action.type,
            status: "failed",
            error: actionErr instanceof Error ? actionErr.message : "Action encountered unexpected exception.",
            executionDurationMs: Date.now() - actionStart,
          });
        }
      }

      // Compute Overall Status
      const totalActions = actionResults.length;
      const successCount = actionResults.filter((a) => a.status === "success").length;
      let overallStatus: "success" | "partial_failure" | "failed" = "success";

      if (successCount === 0 && totalActions > 0) {
        overallStatus = "failed";
      } else if (successCount < totalActions) {
        overallStatus = "partial_failure";
      }

      const log = logAutomationExecution({
        ruleId: rule.id,
        ruleName: rule.name,
        trigger: payload.trigger,
        eventId: payload.eventId,
        orderId: contextData.order_id ? Number(contextData.order_id) : undefined,
        orderNumber: contextData.order_id ? String(contextData.order_id) : undefined,
        productId: contextData.product_id ? Number(contextData.product_id) : undefined,
        productName: contextData.product_name ? String(contextData.product_name) : undefined,
        conditionsMatched: true,
        conditionEvaluations: conditionResult.evaluations,
        actionResults,
        overallStatus,
        durationMs: Date.now() - ruleStartTime,
        isSimulation: payload.isSimulation,
      });

      results.push(log);
    }

    return results;
  }

  /**
   * Safe dry-run simulation of any automation rule against mock or live data.
   */
  async simulateRule(
    rule: AutomationRule,
    mockPayload: Partial<AutomationEventPayload>
  ): Promise<AutomationExecutionLog> {
    const payload: AutomationEventPayload = {
      trigger: rule.trigger,
      orderData: mockPayload.orderData,
      productData: mockPayload.productData,
      variables: mockPayload.variables,
      isSimulation: true,
    };

    const contextData = this.buildContextData(payload);
    const conditionResult = evaluateConditions(rule.conditions, contextData, rule.matchLogic || "AND");

    return {
      id: `sim_${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      trigger: rule.trigger,
      conditionsMatched: conditionResult.matched,
      conditionEvaluations: conditionResult.evaluations,
      actionResults: rule.actions.map((a) => ({
        actionType: a.type,
        status: conditionResult.matched ? "success" : "skipped",
        recipient: String(contextData.customer_email || contextData.customer_phone || "Admin Devices"),
      })),
      overallStatus: conditionResult.matched ? "success" : "condition_unmatched",
      createdAt: new Date().toISOString(),
      durationMs: 4,
      isSimulation: true,
    };
  }

  /**
   * Builds rich context fields for multi-condition evaluation.
   */
  private buildContextData(payload: AutomationEventPayload): Record<string, unknown> {
    const context: Record<string, unknown> = {};

    if (payload.orderData) {
      const order = payload.orderData;
      const billing = (order.billing || {}) as Record<string, unknown>;
      const shipping = (order.shipping || {}) as Record<string, unknown>;
      const lineItems = Array.isArray(order.line_items) ? order.line_items : [];

      context.order_id = order.id || order.number || 0;
      context.order_total = typeof order.total === "number" ? order.total : parseFloat(String(order.total || "0"));
      context.order_subtotal = typeof (order as any).subtotal === "number" ? (order as any).subtotal : parseFloat(String((order as any).subtotal || context.order_total));
      context.order_status = String(order.status || "").toLowerCase();
      context.payment_method = String(order.payment_method || "").toLowerCase();
      context.shipping_method = String((order as any).shipping_lines?.[0]?.method_title || "").toLowerCase();
      context.coupon = String((order as any).coupon_lines?.[0]?.code || "");

      context.customer_email = String(billing.email || "");
      context.customer_phone = String(billing.phone || "");
      context.customer_name = `${billing.first_name || ""} ${billing.last_name || ""}`.trim() || "Customer";
      context.customer_country = String(billing.country || "").toUpperCase();
      context.customer_city = String(billing.city || "");

      const firstItem = lineItems[0] as unknown as Record<string, unknown> | undefined;
      context.product_id = firstItem ? firstItem.product_id || firstItem.id : undefined;
      context.product_name = firstItem ? String(firstItem.name || "") : "Product Item";
      context.sku = firstItem ? String(firstItem.sku || "") : "";
      context.quantity = firstItem ? Number(firstItem.quantity || 1) : 1;
    }

    if (payload.productData) {
      const prod = payload.productData;
      context.product_id = prod.id || 0;
      context.product_name = prod.name || "";
      context.sku = prod.sku || "";
      context.stock_quantity = typeof prod.stock_quantity === "number" ? prod.stock_quantity : parseInt(String(prod.stock_quantity || "0"), 10);
      context.stock_status = String(prod.stock_status || "instock");
      context.price = typeof prod.price === "number" ? prod.price : parseFloat(String(prod.price || "0"));
    }

    if (payload.variables) {
      Object.entries(payload.variables).forEach(([k, v]) => {
        context[k] = v;
      });
    }

    return context;
  }
}

export const automationEngine = new AutomationEngine();
