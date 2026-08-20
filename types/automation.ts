export type AutomationTrigger =
  | "order.created"
  | "order.status_changed"
  | "order.processing"
  | "order.completed"
  | "order.cancelled"
  | "order.refunded"
  | "payment.completed"
  | "payment.failed"
  | "product.created"
  | "product.updated"
  | "product.stock_changed"
  | "product.low_stock"
  | "product.out_of_stock"
  | "customer.created"
  | "customer.updated";

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "contains"
  | "does_not_contain"
  | "is_empty"
  | "is_not_empty";

export interface AutomationCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean;
}

export type AutomationActionType = "send_email" | "send_whatsapp" | "send_admin_notification";

export interface AutomationAction {
  type: AutomationActionType;
  templateId?: string;
  scenario?: string;
  recipientOverride?: string;
  title?: string;
  customMessage?: string;
}

export type VisualNodeType = "trigger" | "condition" | "action";

export interface VisualNodeData {
  label?: string;
  trigger?: AutomationTrigger;
  condition?: AutomationCondition;
  action?: AutomationAction;
  matchLogic?: "AND" | "OR";
}

export interface VisualNode {
  id: string;
  type: VisualNodeType;
  position: { x: number; y: number };
  data: VisualNodeData;
}

export interface VisualEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface VisualGraph {
  nodes: VisualNode[];
  edges: VisualEdge[];
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  matchLogic: "AND" | "OR";
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  visualGraph?: VisualGraph;
  enabled: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActionExecutionResult {
  actionType: AutomationActionType;
  status: "success" | "failed" | "skipped";
  recipient?: string;
  messageId?: string;
  error?: string;
  executionDurationMs?: number;
}

export interface ConditionEvaluationResult {
  field: string;
  operator: ConditionOperator;
  expected: unknown;
  actual: unknown;
  matched: boolean;
}

export interface AutomationExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  trigger: AutomationTrigger;
  eventId?: string;
  orderId?: number;
  orderNumber?: string;
  productId?: number;
  productName?: string;
  conditionsMatched: boolean;
  conditionEvaluations: ConditionEvaluationResult[];
  actionResults: ActionExecutionResult[];
  overallStatus: "success" | "partial_failure" | "failed" | "condition_unmatched" | "skipped_disabled";
  createdAt: string;
  durationMs: number;
  isSimulation?: boolean;
  metadata?: Record<string, unknown>;
}
