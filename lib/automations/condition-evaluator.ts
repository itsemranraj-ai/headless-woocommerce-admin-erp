import { AutomationCondition, ConditionEvaluationResult, ConditionOperator } from "@/types/automation";

/**
 * Evaluates a list of conditions against context data with AND / OR matching logic.
 */
export function evaluateConditions(
  conditions: AutomationCondition[],
  contextData: Record<string, unknown>,
  matchLogic: "AND" | "OR" = "AND"
): { matched: boolean; evaluations: ConditionEvaluationResult[] } {
  if (!conditions || conditions.length === 0) {
    return { matched: true, evaluations: [] };
  }

  const evaluations: ConditionEvaluationResult[] = [];
  let allMatched = true;
  let anyMatched = false;

  for (const condition of conditions) {
    const rawActual = contextData[condition.field];
    const isSingleMatch = evaluateSingleCondition(rawActual, condition.operator, condition.value);

    evaluations.push({
      field: condition.field,
      operator: condition.operator,
      expected: condition.value,
      actual: rawActual !== undefined ? rawActual : null,
      matched: isSingleMatch,
    });

    if (isSingleMatch) {
      anyMatched = true;
    } else {
      allMatched = false;
    }
  }

  const isOverallMatched = matchLogic === "OR" ? anyMatched : allMatched;

  return {
    matched: isOverallMatched,
    evaluations,
  };
}

function evaluateSingleCondition(actual: unknown, operator: ConditionOperator, expected: unknown): boolean {
  // Normalize values
  const numActual = typeof actual === "number" ? actual : parseFloat(String(actual || "0"));
  const numExpected = typeof expected === "number" ? expected : parseFloat(String(expected || "0"));
  const isNumeric = !isNaN(numActual) && !isNaN(numExpected) && typeof expected !== "boolean";

  const strActual = String(actual || "").toLowerCase().trim();
  const strExpected = String(expected || "").toLowerCase().trim();

  switch (operator) {
    case "equals":
      if (isNumeric && typeof expected === "number") {
        return numActual === numExpected;
      }
      return strActual === strExpected;

    case "not_equals":
      if (isNumeric && typeof expected === "number") {
        return numActual !== numExpected;
      }
      return strActual !== strExpected;

    case "greater_than":
      return isNumeric && numActual > numExpected;

    case "less_than":
      return isNumeric && numActual < numExpected;

    case "greater_than_or_equal":
      return isNumeric && numActual >= numExpected;

    case "less_than_or_equal":
      return isNumeric && numActual <= numExpected;

    case "contains":
      return strActual.includes(strExpected);

    case "does_not_contain":
      return !strActual.includes(strExpected);

    case "is_empty":
      return actual === undefined || actual === null || strActual === "" || strActual === "0";

    case "is_not_empty":
      return actual !== undefined && actual !== null && strActual !== "" && strActual !== "0";

    default:
      return false;
  }
}
