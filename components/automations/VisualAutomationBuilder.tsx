"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  AutomationRule,
  VisualNode,
  VisualEdge,
  AutomationTrigger,
  AutomationCondition,
  AutomationAction,
  ConditionOperator,
  AutomationActionType,
} from "@/types/automation";
import { ruleToGraph, graphToRule } from "@/lib/automations/graph-converter";

const TRIGGER_ITEMS: Array<{ value: AutomationTrigger; label: string; icon: string }> = [
  { value: "order.created", label: "Order Created", icon: "📦" },
  { value: "order.status_changed", label: "Status Changed", icon: "🔄" },
  { value: "order.processing", label: "Order Processing", icon: "⚙️" },
  { value: "order.completed", label: "Order Completed", icon: "✓" },
  { value: "order.cancelled", label: "Order Cancelled", icon: "✕" },
  { value: "order.refunded", label: "Order Refunded", icon: "↩" },
  { value: "payment.completed", label: "Payment Completed", icon: "💳" },
  { value: "payment.failed", label: "Payment Failed", icon: "⚠️" },
  { value: "product.low_stock", label: "Low Stock Alert", icon: "📉" },
  { value: "product.out_of_stock", label: "Out of Stock", icon: "🚨" },
  { value: "customer.created", label: "Customer Created", icon: "👤" },
];

const VARIABLE_PILLS = [
  "{customer_name}",
  "{customer_email}",
  "{customer_phone}",
  "{order_id}",
  "{order_total}",
  "{order_status}",
  "{product_name}",
  "{store_name}",
  "{tracking_number}",
];

interface VisualAutomationBuilderProps {
  initialRule?: AutomationRule | null;
  onSave: (ruleData: Partial<AutomationRule>) => Promise<void>;
  onClose: () => void;
  onSimulate?: (rule: AutomationRule) => void;
  meta: {
    triggers: Array<{ value: string; label: string; group: string }>;
    conditionFields: Array<{ value: string; label: string; type: string; group: string }>;
    operators: Array<{ value: string; label: string }>;
    emailTemplates: Array<{ id: string; name: string; scenario: string }>;
    whatsappTemplates: Array<{ id: string; name: string; scenario: string }>;
  } | null;
}

export default function VisualAutomationBuilder({
  initialRule,
  onSave,
  onClose,
  onSimulate,
  meta,
}: VisualAutomationBuilderProps) {
  // Workflow Metadata
  const [ruleName, setRuleName] = useState(initialRule?.name || "New Automation Workflow");
  const [ruleDescription, setRuleDescription] = useState(initialRule?.description || "");
  const [ruleEnabled, setRuleEnabled] = useState(initialRule?.enabled !== undefined ? initialRule.enabled : true);

  // Graph State
  const [nodes, setNodes] = useState<VisualNode[]>([]);
  const [edges, setEdges] = useState<VisualEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Canvas Viewport Pan & Zoom
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Node Dragging
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; nodeX: number; nodeY: number }>({
    mouseX: 0,
    mouseY: 0,
    nodeX: 0,
    nodeY: 0,
  });

  // Connecting Edges
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [connectionMousePos, setConnectionMousePos] = useState<{ x: number; y: number } | null>(null);

  // Palette drawer
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load initial graph
  useEffect(() => {
    if (initialRule) {
      const graph = ruleToGraph(initialRule);
      setNodes(graph.nodes);
      setEdges(graph.edges);
      if (graph.nodes.length > 0) {
        setSelectedNodeId(graph.nodes[0].id);
      }
    } else {
      // Default initial layout
      const triggerId = `node_trigger_${Date.now()}`;
      const actionId = `node_action_${Date.now() + 1}`;
      setNodes([
        {
          id: triggerId,
          type: "trigger",
          position: { x: 380, y: 80 },
          data: { trigger: "order.created", label: "Order Created" },
        },
        {
          id: actionId,
          type: "action",
          position: { x: 380, y: 260 },
          data: {
            action: { type: "send_whatsapp", scenario: "new_order" },
            label: "WhatsApp Notice",
          },
        },
      ]);
      setEdges([
        {
          id: `edge_${triggerId}_${actionId}`,
          source: triggerId,
          target: actionId,
        },
      ]);
      setSelectedNodeId(triggerId);
    }
  }, [initialRule]);

  // Handle Canvas Panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("canvas-bg")) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      setSelectedNodeId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    } else if (draggingNodeId) {
      const dx = (e.clientX - dragStartRef.current.mouseX) / zoom;
      const dy = (e.clientY - dragStartRef.current.mouseY) / zoom;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggingNodeId
            ? {
                ...n,
                position: {
                  x: Math.round(dragStartRef.current.nodeX + dx),
                  y: Math.round(dragStartRef.current.nodeY + dy),
                },
              }
            : n
        )
      );
    } else if (connectingSourceId) {
      const canvasRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setConnectionMousePos({
        x: (e.clientX - canvasRect.left - pan.x) / zoom,
        y: (e.clientY - canvasRect.top - pan.y) / zoom,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
    setConnectingSourceId(null);
    setConnectionMousePos(null);
  };

  // Node Drag Handlers
  const handleNodeMouseDown = (e: React.MouseEvent, node: VisualNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setDraggingNodeId(node.id);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      nodeX: node.position.x,
      nodeY: node.position.y,
    };
  };

  // Edge Connection Handlers
  const handleStartConnect = (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    setConnectingSourceId(sourceId);
  };

  const handleCompleteConnect = (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (connectingSourceId && connectingSourceId !== targetId) {
      // Prevent duplicate edges
      const edgeExists = edges.some((ed) => ed.source === connectingSourceId && ed.target === targetId);
      if (!edgeExists) {
        setEdges((prev) => [
          ...prev,
          {
            id: `edge_${connectingSourceId}_${targetId}`,
            source: connectingSourceId,
            target: targetId,
          },
        ]);
      }
    }
    setConnectingSourceId(null);
    setConnectionMousePos(null);
  };

  const handleDeleteEdge = (edgeId: string) => {
    setEdges((prev) => prev.filter((ed) => ed.id !== edgeId));
  };

  // Add Nodes from Palette
  const handleAddNode = (type: "trigger" | "condition" | "action", defaultData: any) => {
    const newId = `node_${type}_${Date.now()}`;
    const newPos = {
      x: 350 + Math.floor(Math.random() * 40 - 20),
      y: 100 + nodes.length * 80,
    };

    const newNode: VisualNode = {
      id: newId,
      type,
      position: newPos,
      data: defaultData,
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newId);

    // Auto-connect to selected node if exists
    if (selectedNodeId) {
      setEdges((prev) => [
        ...prev,
        {
          id: `edge_${selectedNodeId}_${newId}`,
          source: selectedNodeId,
          target: newId,
        },
      ]);
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  const handleDuplicateNode = (node: VisualNode) => {
    const newId = `node_${node.type}_${Date.now()}`;
    const duplicated: VisualNode = {
      ...node,
      id: newId,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
    };
    setNodes((prev) => [...prev, duplicated]);
    setSelectedNodeId(newId);
  };

  // Node Updates from Config Panel
  const handleUpdateSelectedNodeData = (updates: Partial<VisualNode["data"]>) => {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((n) =>
        n.id === selectedNodeId
          ? {
              ...n,
              data: { ...n.data, ...updates },
            }
          : n
      )
    );
  };

  // Selected Node Reference
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  // Save Validation & Handler
  const handleSaveWorkflow = async () => {
    setValidationError(null);
    const converted = graphToRule(nodes, edges, {
      name: ruleName.trim(),
      description: ruleDescription.trim(),
      enabled: ruleEnabled,
    });

    if (!converted.isValid || !converted.rule) {
      setValidationError(converted.error || "Workflow validation failed.");
      return;
    }

    try {
      setSaving(true);
      await onSave(converted.rule);
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : "Failed to save workflow.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col font-sans select-none overflow-hidden animate-in fade-in duration-150">
      {/* BUILDER HEADER / TOOLBAR */}
      <header className="h-16 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black transition-colors flex items-center gap-1.5"
            title="Return to Automations List"
          >
            <span>← Back</span>
          </button>

          <div className="h-5 w-px bg-slate-800"></div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
            <input
              type="text"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="Automation Workflow Name..."
              className="bg-transparent border-none text-base font-black text-white focus:outline-hidden focus:ring-1 focus:ring-purple-500/50 rounded-lg px-2 py-1 max-w-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Status */}
          <label className="flex items-center gap-2 text-xs font-black text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={ruleEnabled}
              onChange={(e) => setRuleEnabled(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span>{ruleEnabled ? "Active" : "Disabled"}</span>
          </label>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 p-0.5 text-xs font-black text-slate-300">
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              className="px-2.5 py-1 hover:bg-slate-800 rounded-lg"
              title="Zoom Out"
            >
              -
            </button>
            <span className="px-2 font-mono text-[11px] text-slate-400">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
              className="px-2.5 py-1 hover:bg-slate-800 rounded-lg"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="px-2 py-1 hover:bg-slate-800 rounded-lg text-[10px] text-slate-400"
              title="Reset View"
            >
              Reset
            </button>
          </div>

          {/* Node Palette Toggle */}
          <button
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-colors flex items-center gap-1.5 ${
              isPaletteOpen
                ? "bg-purple-950/80 text-purple-200 border-purple-800"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
            }`}
          >
            <span>+</span>
            <span>Add Nodes</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSaveWorkflow}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-black text-white bg-purple-600 hover:bg-purple-500 transition-all shadow-md flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Save Workflow</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* VALIDATION ERROR BANNER */}
      {validationError && (
        <div className="bg-rose-950 border-b border-rose-800 px-6 py-2 text-xs font-bold text-rose-200 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{validationError}</span>
          </div>
          <button onClick={() => setValidationError(null)} className="text-rose-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* MAIN WORKSPACE BODY */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* NODE PALETTE DRAWER (LEFT) */}
        {isPaletteOpen && (
          <aside className="w-72 bg-slate-950/95 backdrop-blur-md border-r border-slate-800 p-4 flex flex-col gap-4 z-20 shrink-0 overflow-y-auto">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                1. Event Triggers
              </span>
              <div className="space-y-1.5">
                {TRIGGER_ITEMS.slice(0, 5).map((trig) => (
                  <button
                    key={trig.value}
                    onClick={() =>
                      handleAddNode("trigger", {
                        trigger: trig.value,
                        label: trig.label,
                      })
                    }
                    className="w-full text-left px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-800 flex items-center gap-2 transition-colors"
                  >
                    <span>{trig.icon}</span>
                    <span className="truncate">{trig.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                2. Conditions & Filters
              </span>
              <div className="space-y-1.5">
                <button
                  onClick={() =>
                    handleAddNode("condition", {
                      condition: { field: "order_total", operator: "greater_than", value: 200 },
                      matchLogic: "AND",
                      label: "Order Total > $200",
                    })
                  }
                  className="w-full text-left px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-amber-300 border border-slate-800 flex items-center gap-2 transition-colors"
                >
                  <span>⚖️</span>
                  <span>Order Total &gt; $200</span>
                </button>
                <button
                  onClick={() =>
                    handleAddNode("condition", {
                      condition: { field: "stock_quantity", operator: "less_than_or_equal", value: 3 },
                      matchLogic: "AND",
                      label: "Stock Quantity <= 3",
                    })
                  }
                  className="w-full text-left px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-amber-300 border border-slate-800 flex items-center gap-2 transition-colors"
                >
                  <span>📉</span>
                  <span>Stock Quantity &le; 3</span>
                </button>
                <button
                  onClick={() =>
                    handleAddNode("condition", {
                      condition: { field: "payment_method", operator: "equals", value: "stripe" },
                      matchLogic: "AND",
                      label: "Payment Method = stripe",
                    })
                  }
                  className="w-full text-left px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-amber-300 border border-slate-800 flex items-center gap-2 transition-colors"
                >
                  <span>💳</span>
                  <span>Payment = Stripe</span>
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                3. Automated Actions
              </span>
              <div className="space-y-1.5">
                <button
                  onClick={() =>
                    handleAddNode("action", {
                      action: { type: "send_whatsapp", scenario: "new_order" },
                      label: "WhatsApp Notice",
                    })
                  }
                  className="w-full text-left px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-emerald-300 border border-slate-800 flex items-center gap-2 transition-colors"
                >
                  <span>💬</span>
                  <span>Send WhatsApp</span>
                </button>
                <button
                  onClick={() =>
                    handleAddNode("action", {
                      action: { type: "send_email", scenario: "new_order" },
                      label: "Email Receipt",
                    })
                  }
                  className="w-full text-left px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-indigo-300 border border-slate-800 flex items-center gap-2 transition-colors"
                >
                  <span>✉️</span>
                  <span>Send Email</span>
                </button>
                <button
                  onClick={() =>
                    handleAddNode("action", {
                      action: { type: "send_admin_notification", title: "Admin Order Notification" },
                      label: "Admin Push Alert",
                    })
                  }
                  className="w-full text-left px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-purple-300 border border-slate-800 flex items-center gap-2 transition-colors"
                >
                  <span>🔔</span>
                  <span>Admin Push Alert</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* INTERACTIVE CANVAS */}
        <div
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="flex-1 h-full relative cursor-grab active:cursor-grabbing overflow-hidden canvas-bg"
          style={{
            backgroundImage: "radial-gradient(#334155 1.2px, transparent 1.2px)",
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          {/* SVG CONNECTION LINES OVERLAY */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#a855f7" />
              </marker>
            </defs>

            {/* Render Existing Edges */}
            {edges.map((edge) => {
              const src = nodes.find((n) => n.id === edge.source);
              const tgt = nodes.find((n) => n.id === edge.target);
              if (!src || !tgt) return null;

              // Node dimensions approx 240x90
              const srcX = (src.position.x + 120) * zoom + pan.x;
              const srcY = (src.position.y + 90) * zoom + pan.y;
              const tgtX = (tgt.position.x + 120) * zoom + pan.x;
              const tgtY = tgt.position.y * zoom + pan.y;

              const dy = Math.abs(tgtY - srcY) * 0.5;
              const pathD = `M ${srcX} ${srcY} C ${srcX} ${srcY + dy}, ${tgtX} ${tgtY - dy}, ${tgtX} ${tgtY}`;

              return (
                <g key={edge.id} className="pointer-events-auto group">
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth={3 * zoom}
                    markerEnd="url(#arrow)"
                    className="opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  {/* Delete edge click spot in middle */}
                  <circle
                    cx={(srcX + tgtX) / 2}
                    cy={(srcY + tgtY) / 2}
                    r={8 * zoom}
                    fill="#1e1b4b"
                    stroke="#a855f7"
                    strokeWidth={1.5}
                    onClick={() => handleDeleteEdge(edge.id)}
                    className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </g>
              );
            })}

            {/* Active connecting line */}
            {connectingSourceId && connectionMousePos && (() => {
              const src = nodes.find((n) => n.id === connectingSourceId);
              if (!src) return null;
              const srcX = (src.position.x + 120) * zoom + pan.x;
              const srcY = (src.position.y + 90) * zoom + pan.y;
              const tgtX = connectionMousePos.x * zoom + pan.x;
              const tgtY = connectionMousePos.y * zoom + pan.y;
              const dy = Math.abs(tgtY - srcY) * 0.5;
              return (
                <path
                  d={`M ${srcX} ${srcY} C ${srcX} ${srcY + dy}, ${tgtX} ${tgtY - dy}, ${tgtX} ${tgtY}`}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={2.5 * zoom}
                  strokeDasharray="5,5"
                  className="animate-pulse"
                />
              );
            })()}
          </svg>

          {/* RENDER NODES */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const x = node.position.x * zoom + pan.x;
            const y = node.position.y * zoom + pan.y;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                style={{
                  transform: `translate(${x}px, ${y}px) scale(${zoom})`,
                  transformOrigin: "top left",
                }}
                className={`absolute w-60 rounded-2xl bg-slate-900 border transition-shadow cursor-grab active:cursor-grabbing p-3.5 z-10 shadow-xl ${
                  isSelected
                    ? "border-purple-500 ring-2 ring-purple-500/30 shadow-purple-900/30"
                    : "border-slate-700 hover:border-slate-500"
                }`}
              >
                {/* Top Input Port (Target) */}
                <div
                  onMouseUp={(e) => handleCompleteConnect(e, node.id)}
                  className="w-3.5 h-3.5 rounded-full bg-slate-800 border-2 border-purple-400 absolute -top-2 left-1/2 -translate-x-1/2 hover:scale-125 transition-transform cursor-pointer"
                  title="Connect input port"
                />

                {/* Node Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    {node.type === "trigger" && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-950 text-blue-300 border border-blue-800">
                        ⚡ Trigger
                      </span>
                    )}
                    {node.type === "condition" && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-950 text-amber-300 border border-amber-800">
                        ⚖️ Condition
                      </span>
                    )}
                    {node.type === "action" && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                        🎯 Action
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateNode(node);
                      }}
                      className="w-5 h-5 rounded hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-[10px]"
                      title="Duplicate"
                    >
                      ⎘
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                      className="w-5 h-5 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-400 flex items-center justify-center text-[10px]"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Node Content Summary */}
                <div className="text-xs font-bold text-white tracking-tight">
                  {node.type === "trigger" && (
                    <div className="space-y-0.5">
                      <div className="font-black text-slate-100">{node.data.trigger || "order.created"}</div>
                      <div className="text-[10px] text-slate-400">Fires on WooCommerce event</div>
                    </div>
                  )}

                  {node.type === "condition" && (
                    <div className="space-y-0.5">
                      <div className="font-mono text-amber-300 text-[11px] truncate">
                        {node.data.condition?.field} {node.data.condition?.operator?.replace(/_/g, " ")} {String(node.data.condition?.value)}
                      </div>
                      <div className="text-[10px] text-slate-400">Filter rule evaluation</div>
                    </div>
                  )}

                  {node.type === "action" && (
                    <div className="space-y-0.5">
                      <div className="font-black text-emerald-300 flex items-center gap-1">
                        <span>{node.data.action?.type === "send_whatsapp" ? "💬 WhatsApp" : node.data.action?.type === "send_email" ? "✉️ Email" : "🔔 Admin Push"}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {node.data.action?.scenario || node.data.action?.title || "Default Scenario"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Output Port (Source) */}
                <div
                  onMouseDown={(e) => handleStartConnect(e, node.id)}
                  className="w-3.5 h-3.5 rounded-full bg-purple-500 border-2 border-white absolute -bottom-2 left-1/2 -translate-x-1/2 hover:scale-125 transition-transform cursor-crosshair shadow-sm"
                  title="Drag from here to connect to next node"
                />
              </div>
            );
          })}
        </div>

        {/* NODE CONFIGURATION SLIDE-OVER DRAWER (RIGHT) */}
        {selectedNode && (
          <aside className="w-80 bg-slate-950/95 backdrop-blur-md border-l border-slate-800 p-5 flex flex-col gap-4 z-20 shrink-0 overflow-y-auto animate-in slide-in-from-right duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block">
                  Configure Selected Node
                </span>
                <h4 className="text-sm font-black text-white capitalize">{selectedNode.type} Node</h4>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* TRIGGER CONFIG */}
            {selectedNode.type === "trigger" && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">Trigger Event</label>
                  <select
                    value={selectedNode.data.trigger || "order.created"}
                    onChange={(e) => handleUpdateSelectedNodeData({ trigger: e.target.value as AutomationTrigger })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-hidden focus:border-purple-500"
                  >
                    {meta?.triggers ? (
                      meta.triggers.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))
                    ) : (
                      <option value="order.created">📦 Order Created</option>
                    )}
                  </select>
                </div>
              </div>
            )}

            {/* CONDITION CONFIG */}
            {selectedNode.type === "condition" && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">Evaluation Field</label>
                  <select
                    value={selectedNode.data.condition?.field || "order_total"}
                    onChange={(e) =>
                      handleUpdateSelectedNodeData({
                        condition: {
                          field: e.target.value,
                          operator: selectedNode.data.condition?.operator || "greater_than",
                          value: selectedNode.data.condition?.value !== undefined ? selectedNode.data.condition.value : 200,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                  >
                    {meta?.conditionFields ? (
                      meta.conditionFields.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))
                    ) : (
                      <option value="order_total">Order Total ($)</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">Comparison Operator</label>
                  <select
                    value={selectedNode.data.condition?.operator || "greater_than"}
                    onChange={(e) =>
                      handleUpdateSelectedNodeData({
                        condition: {
                          field: selectedNode.data.condition?.field || "order_total",
                          operator: e.target.value as ConditionOperator,
                          value: selectedNode.data.condition?.value !== undefined ? selectedNode.data.condition.value : 200,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                  >
                    {meta?.operators ? (
                      meta.operators.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))
                    ) : (
                      <option value="greater_than">Greater Than (&gt;)</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">Target Value</label>
                  <input
                    type="text"
                    value={String(selectedNode.data.condition?.value ?? "200")}
                    onChange={(e) =>
                      handleUpdateSelectedNodeData({
                        condition: {
                          field: selectedNode.data.condition?.field || "order_total",
                          operator: selectedNode.data.condition?.operator || "greater_than",
                          value: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. 200 or processing"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* ACTION CONFIG */}
            {selectedNode.type === "action" && (
              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">Action Type</label>
                  <select
                    value={selectedNode.data.action?.type || "send_whatsapp"}
                    onChange={(e) =>
                      handleUpdateSelectedNodeData({
                        action: {
                          type: e.target.value as AutomationActionType,
                          scenario: "new_order",
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                  >
                    <option value="send_whatsapp">💬 Send WhatsApp Message</option>
                    <option value="send_email">✉️ Send Email Notification</option>
                    <option value="send_admin_notification">🔔 Broadcast Admin Push</option>
                  </select>
                </div>

                {selectedNode.data.action?.type === "send_whatsapp" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400">Select Template</label>
                      <select
                        value={selectedNode.data.action.scenario || "new_order"}
                        onChange={(e) =>
                          handleUpdateSelectedNodeData({
                            action: { ...selectedNode.data.action!, scenario: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                      >
                        {meta?.whatsappTemplates ? (
                          meta.whatsappTemplates.map((t) => (
                            <option key={t.id} value={t.scenario}>
                              {t.name}
                            </option>
                          ))
                        ) : (
                          <option value="new_order">New Order Received</option>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400">Recipient Phone Override</label>
                      <input
                        type="text"
                        value={selectedNode.data.action.recipientOverride || ""}
                        onChange={(e) =>
                          handleUpdateSelectedNodeData({
                            action: { ...selectedNode.data.action!, recipientOverride: e.target.value },
                          })
                        }
                        placeholder="Default: Customer Phone from Order"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white font-mono"
                      />
                    </div>
                  </>
                )}

                {selectedNode.data.action?.type === "send_email" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400">Select Template</label>
                      <select
                        value={selectedNode.data.action.scenario || "new_order"}
                        onChange={(e) =>
                          handleUpdateSelectedNodeData({
                            action: { ...selectedNode.data.action!, scenario: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                      >
                        {meta?.emailTemplates ? (
                          meta.emailTemplates.map((t) => (
                            <option key={t.id} value={t.scenario}>
                              {t.name}
                            </option>
                          ))
                        ) : (
                          <option value="new_order">New Order Invoice</option>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400">Recipient Email Override</label>
                      <input
                        type="text"
                        value={selectedNode.data.action.recipientOverride || ""}
                        onChange={(e) =>
                          handleUpdateSelectedNodeData({
                            action: { ...selectedNode.data.action!, recipientOverride: e.target.value },
                          })
                        }
                        placeholder="Default: Customer Email from Order"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white font-mono"
                      />
                    </div>
                  </>
                )}

                {selectedNode.data.action?.type === "send_admin_notification" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400">Notification Title</label>
                    <input
                      type="text"
                      value={selectedNode.data.action.title || ""}
                      onChange={(e) =>
                        handleUpdateSelectedNodeData({
                          action: { ...selectedNode.data.action!, title: e.target.value },
                        })
                      }
                      placeholder="e.g. VIP Order Placed"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Dynamic Variable Pills Helper */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Available Dynamic Variables:
              </span>
              <div className="flex flex-wrap gap-1">
                {VARIABLE_PILLS.map((token) => (
                  <span
                    key={token}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800"
                  >
                    {token}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
