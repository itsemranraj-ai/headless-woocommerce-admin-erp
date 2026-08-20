"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AutomationRule,
  AutomationExecutionLog,
  AutomationTrigger,
} from "@/types/automation";
import VisualAutomationBuilder from "@/components/automations/VisualAutomationBuilder";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const TRIGGER_META: Record<string, { label: string; color: string; icon: string }> = {
  "order.created": { label: "Order Created", color: "bg-blue-50 text-blue-700 border-blue-200", icon: "📦" },
  "order.status_changed": { label: "Status Changed", color: "bg-cyan-50 text-cyan-700 border-cyan-200", icon: "🔄" },
  "order.processing": { label: "Order Processing", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: "⚙️" },
  "order.completed": { label: "Order Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "✓" },
  "order.cancelled": { label: "Order Cancelled", color: "bg-rose-50 text-rose-700 border-rose-200", icon: "✕" },
  "order.refunded": { label: "Order Refunded", color: "bg-slate-50 text-slate-700 border-slate-200", icon: "↩" },
  "payment.completed": { label: "Payment Completed", color: "bg-teal-50 text-teal-700 border-teal-200", icon: "💳" },
  "payment.failed": { label: "Payment Failed", color: "bg-amber-50 text-amber-700 border-amber-200", icon: "⚠️" },
  "product.created": { label: "Product Created", color: "bg-sky-50 text-sky-700 border-sky-200", icon: "🆕" },
  "product.updated": { label: "Product Updated", color: "bg-slate-50 text-slate-700 border-slate-200", icon: "📝" },
  "product.stock_changed": { label: "Stock Changed", color: "bg-orange-50 text-orange-700 border-orange-200", icon: "📊" },
  "product.low_stock": { label: "Low Stock Alert", color: "bg-yellow-50 text-yellow-800 border-yellow-200", icon: "📉" },
  "product.out_of_stock": { label: "Out of Stock", color: "bg-red-50 text-red-700 border-red-200", icon: "🚨" },
  "customer.created": { label: "Customer Created", color: "bg-violet-50 text-violet-700 border-violet-200", icon: "👤" },
  "customer.updated": { label: "Customer Updated", color: "bg-violet-50 text-violet-700 border-violet-200", icon: "👤" },
};

const ACTION_META: Record<string, { label: string; icon: string; color: string }> = {
  send_email: { label: "Email", icon: "✉️", color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  send_whatsapp: { label: "WhatsApp", icon: "💬", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  send_admin_notification: { label: "Admin Push", icon: "🔔", color: "bg-purple-50 text-purple-700 border-purple-100" },
};

interface FormMeta {
  triggers: Array<{ value: string; label: string; group: string }>;
  conditionFields: Array<{ value: string; label: string; type: string; group: string }>;
  operators: Array<{ value: string; label: string }>;
  emailTemplates: Array<{ id: string; name: string; scenario: string }>;
  whatsappTemplates: Array<{ id: string; name: string; scenario: string }>;
}

export default function AutomationsPage() {
  const [activeTab, setActiveTab] = useState<"rules" | "logs" | "simulate">("rules");

  // State: Automations
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [ruleSearch, setRuleSearch] = useState("");
  const [ruleStatusFilter, setRuleStatusFilter] = useState("all");
  const [selectedDetailRule, setSelectedDetailRule] = useState<AutomationRule | null>(null);

  // State: Visual Drag-and-Drop Builder
  const [isVisualBuilderOpen, setIsVisualBuilderOpen] = useState(false);
  const [editingVisualRule, setEditingVisualRule] = useState<AutomationRule | null>(null);

  // State: Form Metadata (Triggers, Fields, Templates)
  const [meta, setMeta] = useState<FormMeta | null>(null);

  // State: Logs
  const [logs, setLogs] = useState<AutomationExecutionLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logTriggerFilter, setLogTriggerFilter] = useState("all");
  const [logStatusFilter, setLogStatusFilter] = useState("all");
  const [logSearch, setLogSearch] = useState("");
  const [logStats, setLogStats] = useState({ total: 0, successCount: 0, partialFailureCount: 0, failedCount: 0 });
  const [activeLogDetail, setActiveLogDetail] = useState<AutomationExecutionLog | null>(null);

  // State: Simulation
  const [simRuleId, setSimRuleId] = useState("");
  const [simOrderId, setSimOrderId] = useState("1058");
  const [simTotal, setSimTotal] = useState("250.00");
  const [simStock, setSimStock] = useState("2");
  const [runningSim, setRunningSim] = useState(false);
  const [simLog, setSimLog] = useState<AutomationExecutionLog | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadRules = async () => {
    try {
      setRulesLoading(true);
      const res = await fetch("/api/automations/rules");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRules(json.data);
        if (!simRuleId && json.data.length > 0) {
          setSimRuleId(json.data[0].id);
        }
      }
    } catch {
      // Ignore
    } finally {
      setRulesLoading(false);
    }
  };

  const loadMeta = async () => {
    try {
      const res = await fetch("/api/automations/meta");
      const json = await res.json();
      if (json.success && json.data) {
        setMeta(json.data);
      }
    } catch {
      // Ignore
    }
  };

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      const params = new URLSearchParams();
      if (logTriggerFilter !== "all") params.set("trigger", logTriggerFilter);
      if (logStatusFilter !== "all") params.set("status", logStatusFilter);
      if (logSearch.trim()) params.set("search", logSearch.trim());

      const res = await fetch(`/api/automations/logs?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setLogs(json.data.logs || []);
        setLogStats({
          total: json.data.total || 0,
          successCount: json.data.successCount || 0,
          partialFailureCount: json.data.partialFailureCount || 0,
          failedCount: json.data.failedCount || 0,
        });
      }
    } catch {
      // Ignore
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
    loadMeta();
    loadLogs();
  }, []);

  useEffect(() => {
    if (activeTab === "logs") {
      loadLogs();
    }
  }, [logTriggerFilter, logStatusFilter, logSearch, activeTab]);

  // Open Visual Builder
  const handleOpenCreateVisual = () => {
    setEditingVisualRule(null);
    setIsVisualBuilderOpen(true);
  };

  const handleOpenEditVisual = (rule: AutomationRule) => {
    setEditingVisualRule(rule);
    setIsVisualBuilderOpen(true);
  };

  // Handle Save from Visual Builder
  const handleSaveFromVisualBuilder = async (ruleData: Partial<AutomationRule>) => {
    try {
      const res = await fetch("/api/automations/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editingVisualRule ? "update" : "create",
          id: editingVisualRule?.id,
          ruleData,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(editingVisualRule ? "Workflow updated!" : "Workflow created!");
        setIsVisualBuilderOpen(false);
        loadRules();
      } else {
        showToast(json.error?.message || "Failed to save workflow.", "error");
        throw new Error(json.error?.message || "Save failed.");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message !== "Save failed.") {
        showToast("Network error saving workflow.", "error");
      }
      throw err;
    }
  };

  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch("/api/automations/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle",
          id: ruleId,
          enabled: !currentEnabled,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(!currentEnabled ? "Automation enabled!" : "Automation disabled.");
        loadRules();
      } else {
        showToast(json.error?.message || "Failed to toggle rule state.", "error");
      }
    } catch {
      showToast("Network error toggling rule.", "error");
    }
  };

  const handleDuplicateRule = async (ruleId: string) => {
    try {
      const res = await fetch("/api/automations/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate", id: ruleId }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Automation duplicated!");
        loadRules();
      } else {
        showToast(json.error?.message || "Failed to duplicate automation.", "error");
      }
    } catch {
      showToast("Network error duplicating automation.", "error");
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this automation?")) return;

    try {
      const res = await fetch("/api/automations/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: ruleId }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Automation deleted.");
        loadRules();
      } else {
        showToast(json.error?.message || "Failed to delete automation.", "error");
      }
    } catch {
      showToast("Network error deleting automation.", "error");
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm("Restore default pre-seeded automations?")) return;

    try {
      const res = await fetch("/api/automations/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_defaults" }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Default automations restored!");
        loadRules();
      }
    } catch {
      showToast("Failed to reset automations.", "error");
    }
  };

  const handleRunSimulation = async () => {
    if (!simRuleId) return;

    setRunningSim(true);
    setSimLog(null);

    try {
      const res = await fetch("/api/automations/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId: simRuleId,
          orderId: simOrderId ? Number(simOrderId) : undefined,
          customTotal: parseFloat(simTotal) || 250,
          customStock: parseInt(simStock, 10) || 2,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setSimLog(json.data);
        showToast("Dry-run simulation completed!");
        loadLogs();
      } else {
        showToast(json.error?.message || "Simulation failed.", "error");
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Simulation request failed.", "error");
    } finally {
      setRunningSim(false);
    }
  };

  // Filtered Rules
  const filteredRules = rules.filter((r) => {
    if (ruleStatusFilter === "active" && !r.enabled) return false;
    if (ruleStatusFilter === "disabled" && r.enabled) return false;
    if (ruleSearch.trim()) {
      const q = ruleSearch.toLowerCase().trim();
      return (
        r.name.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.trigger.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 w-full px-5 sm:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-6 font-sans pb-16">
      {/* Toast Banner */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-black flex items-center gap-3 transition-all animate-bounce ${
            toast.type === "success"
              ? "bg-emerald-950 text-emerald-100 border-emerald-700 shadow-emerald-900/30"
              : "bg-rose-950 text-rose-100 border-rose-700 shadow-rose-900/30"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Visual Drag-and-Drop Builder Modal Overlay */}
      {isVisualBuilderOpen && (
        <VisualAutomationBuilder
          initialRule={editingVisualRule}
          onSave={handleSaveFromVisualBuilder}
          onClose={() => setIsVisualBuilderOpen(false)}
          meta={meta}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
              Visual Builder
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Drag-and-Drop Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight flex items-center gap-3">
            <span>⚡ Visual Automation Builder</span>
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">
            Visually construct, connect, and automate WooCommerce event triggers, condition filters, and Email, WhatsApp, & Push actions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl text-xs font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
            title="Restore default pre-seeded automations"
          >
            ↺ Defaults
          </button>
          <button
            onClick={handleOpenCreateVisual}
            className="px-4 py-2 rounded-xl text-xs font-black text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Visual Builder</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "rules"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>⚡ Workflows</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === "rules" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
          }`}>
            {rules.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "logs"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>📊 Execution History</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === "logs" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
          }`}>
            {logStats.total}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("simulate")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "simulate"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>🧪 Dry-Run Simulator</span>
        </button>
      </div>

      {/* TAB 1: AUTOMATIONS LIST / CARDS */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRuleStatusFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                  ruleStatusFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({rules.length})
              </button>
              <button
                onClick={() => setRuleStatusFilter("active")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                  ruleStatusFilter === "active" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Active ({rules.filter((r) => r.enabled).length})
              </button>
              <button
                onClick={() => setRuleStatusFilter("disabled")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                  ruleStatusFilter === "disabled" ? "bg-slate-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Disabled ({rules.filter((r) => !r.enabled).length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={ruleSearch}
                onChange={(e) => setRuleSearch(e.target.value)}
                placeholder="Search workflows..."
                className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredRules.map((rule) => {
              const triggerMeta = TRIGGER_META[rule.trigger] || { label: rule.trigger, color: "bg-slate-100 text-slate-800", icon: "⚡" };
              return (
                <div
                  key={rule.id}
                  className={`bg-white rounded-3xl border p-5 shadow-2xs transition-all flex flex-col justify-between gap-4 ${
                    rule.enabled ? "border-slate-200/90 hover:border-slate-300" : "border-slate-200 opacity-60 bg-slate-50/50"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${triggerMeta.color}`}>
                        <span>{triggerMeta.icon}</span>
                        <span>{triggerMeta.label}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleRule(rule.id, rule.enabled)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          rule.enabled ? "bg-purple-600" : "bg-slate-300"
                        }`}
                        title={rule.enabled ? "Disable automation" : "Enable automation"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            rule.enabled ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div>
                      <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                        {rule.name}
                      </h3>
                      {rule.description && (
                        <p className="text-xs font-bold text-slate-500 mt-1 line-clamp-2">
                          {rule.description}
                        </p>
                      )}
                    </div>

                    {/* Conditions Box */}
                    {rule.conditions && rule.conditions.length > 0 ? (
                      <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-100 text-[11px] font-bold text-amber-900 space-y-1">
                        <div className="text-[10px] font-black uppercase text-amber-800/70">
                          Match: {rule.matchLogic || "AND"} ({rule.conditions.length} condition{rule.conditions.length > 1 ? "s" : ""})
                        </div>
                        <div className="font-mono text-[11px]">
                          {rule.conditions.map((c, i) => (
                            <div key={i} className="truncate">
                              • {c.field} {c.operator.replace(/_/g, " ")} {String(c.value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                        <span>⚡</span>
                        <span>Instant trigger (No condition filters)</span>
                      </div>
                    )}

                    {/* Action Badges */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Workflow Actions:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {rule.actions.map((act, i) => {
                          const meta = ACTION_META[act.type] || { label: act.type, icon: "⚡", color: "bg-slate-100 text-slate-700" };
                          return (
                            <span
                              key={i}
                              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border flex items-center gap-1 ${meta.color}`}
                            >
                              <span>{meta.icon}</span>
                              <span>{meta.label}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditVisual(rule)}
                        className="px-3 py-1.5 rounded-xl text-xs font-black text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center gap-1"
                      >
                        <span>✎</span>
                        <span>Visual Builder</span>
                      </button>
                      <button
                        onClick={() => handleDuplicateRule(rule.id)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Duplicate automation"
                      >
                        ⎘
                      </button>
                      {!rule.isDefault && (
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-black text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete automation"
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSimRuleId(rule.id);
                        setActiveTab("simulate");
                      }}
                      className="text-xs font-extrabold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                    >
                      <span>Simulate</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: EXECUTION LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setLogStatusFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap ${
                  logStatusFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({logStats.total})
              </button>
              <button
                onClick={() => setLogStatusFilter("success")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap ${
                  logStatusFilter === "success" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                Success ({logStats.successCount})
              </button>
              <button
                onClick={() => setLogStatusFilter("partial_failure")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap ${
                  logStatusFilter === "partial_failure" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                Partial ({logStats.partialFailureCount})
              </button>
              <button
                onClick={() => setLogStatusFilter("failed")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap ${
                  logStatusFilter === "failed" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                Failed ({logStats.failedCount})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search rule, order, product..."
                className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
              />
              <button
                onClick={loadLogs}
                className="px-3 py-1.5 rounded-xl text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {logs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-sm">
                No automation execution logs found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Automation</th>
                      <th className="py-3.5 px-4">Trigger</th>
                      <th className="py-3.5 px-4">Entity</th>
                      <th className="py-3.5 px-4">Actions Executed</th>
                      <th className="py-3.5 px-4">Timestamp</th>
                      <th className="py-3.5 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              log.overallStatus === "success"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : log.overallStatus === "partial_failure"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : log.overallStatus === "condition_unmatched"
                                ? "bg-slate-100 text-slate-600 border border-slate-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {log.overallStatus === "condition_unmatched"
                              ? "Filtered"
                              : log.overallStatus.replace("_", " ").toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-slate-900 max-w-xs truncate">
                          {log.ruleName}
                          {log.isSimulation && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] bg-purple-100 text-purple-800 font-mono">
                              DRY-RUN
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{log.trigger}</td>
                        <td className="py-3 px-4">
                          {log.orderId ? (
                            <Link href={`/orders/${log.orderId}`} className="text-purple-600 underline">
                              Order #{log.orderId}
                            </Link>
                          ) : log.productName ? (
                            <span className="text-slate-900 truncate max-w-xs">{log.productName}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {log.actionResults.map((act, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  act.status === "success"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-rose-50 text-rose-700"
                                }`}
                                title={`${act.actionType}: ${act.status}`}
                              >
                                {act.actionType.replace("send_", "")}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setActiveLogDetail(log)}
                            className="text-xs font-black text-purple-600 hover:text-purple-800"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DRY-RUN SIMULATOR */}
      {activeTab === "simulate" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="rounded-3xl border-slate-200/80 shadow-2xs">
              <CardHeader>
                <CardTitle className="text-lg font-black text-slate-900">
                  Workflow Dry-Run Simulation
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500">
                  Safely test visual workflow triggers, conditions, and action executions in dry-run mode without sending real customer messages.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Select Workflow
                  </label>
                  <select
                    value={simRuleId}
                    onChange={(e) => setSimRuleId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
                  >
                    {rules.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.trigger})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Simulated Order Total ($)
                    </label>
                    <input
                      type="number"
                      value={simTotal}
                      onChange={(e) => setSimTotal(e.target.value)}
                      placeholder="250.00"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Simulated Stock Quantity
                    </label>
                    <input
                      type="number"
                      value={simStock}
                      onChange={(e) => setSimStock(e.target.value)}
                      placeholder="2"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunSimulation}
                  disabled={runningSim}
                  className="w-full py-3 rounded-2xl text-sm font-black text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-md flex items-center justify-center gap-2 mt-4"
                >
                  {runningSim ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin"></span>
                      <span>Simulating Workflow Execution...</span>
                    </>
                  ) : (
                    <>
                      <span>🧪</span>
                      <span>Run Safe Dry-Run Simulation</span>
                    </>
                  )}
                </button>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="rounded-3xl border-slate-200/80 shadow-2xs overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-sm font-black text-slate-900">
                  Simulation Execution Audit
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {simLog ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">{simLog.ruleName}</span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          simLog.overallStatus === "success"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : simLog.overallStatus === "condition_unmatched"
                            ? "bg-slate-100 text-slate-600 border border-slate-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {simLog.overallStatus.replace("_", " ").toUpperCase()}
                      </span>
                    </div>

                    {/* Condition Results */}
                    {simLog.conditionEvaluations.length > 0 && (
                      <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="text-[10px] font-black uppercase text-slate-400">Conditions Breakdown:</div>
                        {simLog.conditionEvaluations.map((cond, i) => (
                          <div key={i} className="flex items-center justify-between text-xs font-mono">
                            <span>{cond.field} {cond.operator} {String(cond.expected)}</span>
                            <span className={cond.matched ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                              {cond.matched ? "✓ Matched" : "✕ Unmatched"} (Actual: {String(cond.actual)})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Executions */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-black uppercase text-slate-400">Actions Executed (Dry-Run):</div>
                      {simLog.actionResults.map((act, i) => (
                        <div key={i} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1.5">
                            <span>{ACTION_META[act.actionType]?.icon}</span>
                            <span>{ACTION_META[act.actionType]?.label}</span>
                          </span>
                          <span className="text-emerald-600 font-black">✓ Evaluated (Dry-Run)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs font-bold">
                    Select a workflow on the left and run simulation to inspect step-by-step condition matching and action dispatches.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* LOG DETAILS MODAL */}
      {activeLogDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Automation Execution Audit</h3>
              <button
                onClick={() => setActiveLogDetail(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-bold text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Rule:</span>
                <span className="text-slate-900 font-black">{activeLogDetail.ruleName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Trigger:</span>
                <span className="font-mono text-slate-900">{activeLogDetail.trigger}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Overall Status:</span>
                <span className={activeLogDetail.overallStatus === "success" ? "text-emerald-600 font-black" : "text-rose-600 font-black"}>
                  {activeLogDetail.overallStatus.toUpperCase()}
                </span>
              </div>
              {activeLogDetail.orderId && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Related Order:</span>
                  <Link href={`/orders/${activeLogDetail.orderId}`} className="text-purple-600 underline">
                    #{activeLogDetail.orderId}
                  </Link>
                </div>
              )}

              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-black uppercase text-slate-400">Action Execution Details:</span>
                {activeLogDetail.actionResults.map((act, i) => (
                  <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900">{act.actionType}</span>
                      <span className={act.status === "success" ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                        {act.status.toUpperCase()}
                      </span>
                    </div>
                    {act.recipient && <div className="text-[11px] text-slate-500 mt-1 font-mono">Recipient: {act.recipient}</div>}
                    {act.error && <div className="text-[11px] text-rose-600 mt-1 font-mono">{act.error}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setActiveLogDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-slate-900 hover:bg-black"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
