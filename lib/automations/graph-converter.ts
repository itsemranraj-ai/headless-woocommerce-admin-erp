import {
  AutomationRule,
  VisualGraph,
  VisualNode,
  VisualEdge,
  AutomationCondition,
  AutomationAction,
} from "@/types/automation";

/**
 * Converts a standard AutomationRule into a VisualGraph layout with automatic node positioning.
 */
export function ruleToGraph(rule: AutomationRule): VisualGraph {
  // If rule already has a saved visual graph with nodes, use it
  if (rule.visualGraph && Array.isArray(rule.visualGraph.nodes) && rule.visualGraph.nodes.length > 0) {
    return rule.visualGraph;
  }

  const nodes: VisualNode[] = [];
  const edges: VisualEdge[] = [];

  let currentY = 80;
  const startX = 350;

  // 1. Trigger Node
  const triggerNodeId = `node_trigger_${Date.now()}`;
  nodes.push({
    id: triggerNodeId,
    type: "trigger",
    position: { x: startX, y: currentY },
    data: {
      trigger: rule.trigger,
      label: `Trigger: ${rule.trigger}`,
    },
  });

  let previousNodeId = triggerNodeId;
  currentY += 150;

  // 2. Condition Nodes
  if (rule.conditions && rule.conditions.length > 0) {
    rule.conditions.forEach((cond, idx) => {
      const condNodeId = `node_cond_${Date.now()}_${idx}`;
      nodes.push({
        id: condNodeId,
        type: "condition",
        position: { x: startX, y: currentY },
        data: {
          condition: cond,
          matchLogic: rule.matchLogic || "AND",
          label: `${cond.field} ${cond.operator} ${cond.value}`,
        },
      });

      edges.push({
        id: `edge_${previousNodeId}_${condNodeId}`,
        source: previousNodeId,
        target: condNodeId,
      });

      previousNodeId = condNodeId;
      currentY += 150;
    });
  }

  // 3. Action Nodes (arranged horizontally or sequentially)
  if (rule.actions && rule.actions.length > 0) {
    const actionCount = rule.actions.length;
    const spacing = 280;
    const totalWidth = (actionCount - 1) * spacing;
    const actionStartX = startX - totalWidth / 2;

    rule.actions.forEach((act, idx) => {
      const actNodeId = `node_act_${Date.now()}_${idx}`;
      const actionX = actionCount === 1 ? startX : actionStartX + idx * spacing;

      nodes.push({
        id: actNodeId,
        type: "action",
        position: { x: actionX, y: currentY },
        data: {
          action: act,
          label: act.type.replace("send_", "").toUpperCase(),
        },
      });

      edges.push({
        id: `edge_${previousNodeId}_${actNodeId}`,
        source: previousNodeId,
        target: actNodeId,
      });
    });
  }

  return { nodes, edges };
}

/**
 * Converts visual graph nodes and edges back into an AutomationRule schema.
 */
export function graphToRule(
  nodes: VisualNode[],
  edges: VisualEdge[],
  base: Partial<AutomationRule> = {}
): {
  isValid: boolean;
  error?: string;
  rule?: Partial<AutomationRule>;
} {
  // 1. Find trigger node
  const triggerNode = nodes.find((n) => n.type === "trigger");
  if (!triggerNode || !triggerNode.data.trigger) {
    return { isValid: false, error: "A Trigger node is required in your workflow." };
  }

  // 2. Extract Condition nodes
  const conditionNodes = nodes.filter((n) => n.type === "condition");
  const conditions: AutomationCondition[] = [];
  for (const cNode of conditionNodes) {
    if (!cNode.data.condition || !cNode.data.condition.field) {
      return { isValid: false, error: "One or more Condition nodes are incomplete." };
    }
    conditions.push(cNode.data.condition);
  }

  // 3. Extract Action nodes
  const actionNodes = nodes.filter((n) => n.type === "action");
  if (actionNodes.length === 0) {
    return { isValid: false, error: "At least one Action node is required in your workflow." };
  }

  const actions: AutomationAction[] = [];
  for (const aNode of actionNodes) {
    if (!aNode.data.action || !aNode.data.action.type) {
      return { isValid: false, error: "One or more Action nodes are missing action configuration." };
    }
    actions.push(aNode.data.action);
  }

  const rule: Partial<AutomationRule> = {
    ...base,
    trigger: triggerNode.data.trigger,
    matchLogic: (triggerNode.data.matchLogic || conditionNodes[0]?.data.matchLogic || "AND") as "AND" | "OR",
    conditions,
    actions,
    visualGraph: {
      nodes,
      edges,
    },
  };

  return {
    isValid: true,
    rule,
  };
}
