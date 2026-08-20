"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { WhatsAppConfig, WhatsAppTemplate, WhatsAppLog, WhatsAppScenario } from "@/types/whatsapp";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const SCENARIO_LABELS: Record<WhatsAppScenario, { label: string; color: string; icon: string }> = {
  new_order: { label: "New Order", color: "bg-blue-50 text-blue-700 border-blue-200", icon: "📦" },
  order_confirmed: { label: "Order Confirmed", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "✓" },
  order_processing: { label: "Processing", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: "⚙️" },
  order_shipped: { label: "Order Shipped", color: "bg-purple-50 text-purple-700 border-purple-200", icon: "🚚" },
  order_completed: { label: "Completed", color: "bg-teal-50 text-teal-700 border-teal-200", icon: "✨" },
  order_cancelled: { label: "Cancelled", color: "bg-rose-50 text-rose-700 border-rose-200", icon: "✕" },
  payment_failed: { label: "Payment Failed", color: "bg-amber-50 text-amber-700 border-amber-200", icon: "⚠️" },
  custom: { label: "Custom Message", color: "bg-slate-50 text-slate-700 border-slate-200", icon: "💬" },
};

const VARIABLE_HELPERS = [
  { token: "{customer_name}", desc: "Customer Full Name" },
  { token: "{customer_phone}", desc: "Customer Phone Number" },
  { token: "{order_id}", desc: "WooCommerce Order ID" },
  { token: "{order_total}", desc: "Order Total ($)" },
  { token: "{order_status}", desc: "Current Order Status" },
  { token: "{order_date}", desc: "Order Date Placed" },
  { token: "{store_name}", desc: "Store Name (Store ERP)" },
  { token: "{tracking_number}", desc: "Shipment Tracking ID" },
];

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState<"templates" | "settings" | "logs" | "test">("templates");

  // State: Templates
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Template Form
  const [formName, setFormName] = useState("");
  const [formScenario, setFormScenario] = useState<WhatsAppScenario>("new_order");
  const [formContent, setFormContent] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);

  // State: Settings
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [apiVersion, setApiVersion] = useState("v21.0");
  const [showToken, setShowToken] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);

  // State: Logs
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logStatusFilter, setLogStatusFilter] = useState("all");
  const [logSearch, setLogSearch] = useState("");
  const [logStats, setLogStats] = useState({ total: 0, sentCount: 0, failedCount: 0 });
  const [activeLogDetail, setActiveLogDetail] = useState<WhatsAppLog | null>(null);

  // State: Test Simulator
  const [testPhoneTo, setTestPhoneTo] = useState("");
  const [testTemplateId, setTestTemplateId] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; normalized?: string } | null>(null);

  // Notification Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Loaders
  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const res = await fetch("/api/whatsapp/templates");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTemplates(json.data);
        if (!testTemplateId && json.data.length > 0) {
          setTestTemplateId(json.data[0].id);
        }
      }
    } catch {
      // Ignore
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      setConfigLoading(true);
      const res = await fetch("/api/whatsapp/config");
      const json = await res.json();
      if (json.success && json.data) {
        let finalWabaId = json.data.wabaId || "";
        let finalPhoneId = json.data.phoneNumberId || "";
        let finalToken = json.data.accessTokenMasked || "";
        let isConfig = json.data.isConfigured;

        if (!finalWabaId || !finalPhoneId) {
          try {
            const cached = localStorage.getItem("ff_whatsapp_client_cache");
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed.wabaId) finalWabaId = parsed.wabaId;
              if (parsed.phoneNumberId) finalPhoneId = parsed.phoneNumberId;
              if (parsed.accessTokenMasked) finalToken = parsed.accessTokenMasked;
              if (parsed.isConfigured) isConfig = true;
            }
          } catch {
            // Ignore
          }
        }

        setConfig({ ...json.data, wabaId: finalWabaId, phoneNumberId: finalPhoneId, isConfigured: isConfig });
        setWabaId(finalWabaId);
        setPhoneNumberId(finalPhoneId);
        setApiVersion(json.data.apiVersion || "v21.0");
        setAccessToken(finalToken);
      }
    } catch {
      // Ignore
    } finally {
      setConfigLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      const params = new URLSearchParams();
      if (logStatusFilter !== "all") params.set("status", logStatusFilter);
      if (logSearch.trim()) params.set("search", logSearch.trim());

      const res = await fetch(`/api/whatsapp/logs?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setLogs(json.data.logs || []);
        setLogStats({
          total: json.data.total || 0,
          sentCount: json.data.sentCount || 0,
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
    loadTemplates();
    loadConfig();
    loadLogs();
  }, []);

  useEffect(() => {
    if (activeTab === "logs") {
      loadLogs();
    }
  }, [logStatusFilter, logSearch, activeTab]);

  // Handle Template Actions
  const handleOpenCreateModal = () => {
    setSelectedTemplate(null);
    setFormName("");
    setFormScenario("new_order");
    setFormContent("Hi {customer_name}! 👋 Thank you for placing order #{order_id} with {store_name}. Total: ${order_total}.");
    setFormEnabled(true);
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = (tpl: WhatsAppTemplate) => {
    setSelectedTemplate(tpl);
    setFormName(tpl.name);
    setFormScenario(tpl.scenario);
    setFormContent(tpl.content);
    setFormEnabled(tpl.enabled);
    setIsEditorOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!formName.trim() || !formContent.trim()) {
      showToast("Please provide template name and message content.", "error");
      return;
    }

    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selectedTemplate ? "update" : "create",
          id: selectedTemplate?.id,
          templateData: {
            name: formName,
            scenario: formScenario,
            content: formContent,
            enabled: formEnabled,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(selectedTemplate ? "Template updated!" : "Template created!");
        setIsEditorOpen(false);
        loadTemplates();
      } else {
        showToast(json.error?.message || "Failed to save template.", "error");
      }
    } catch {
      showToast("Network error saving template.", "error");
    }
  };

  const handleToggleTemplate = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle",
          id,
          enabled: !currentEnabled,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(!currentEnabled ? "Template enabled." : "Template disabled.");
        loadTemplates();
      }
    } catch {
      showToast("Failed to toggle template.", "error");
    }
  };

  const handleDuplicateTemplate = async (id: string) => {
    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate", id }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Template duplicated!");
        loadTemplates();
      }
    } catch {
      showToast("Failed to duplicate template.", "error");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this WhatsApp template?")) return;
    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Template deleted.");
        loadTemplates();
      }
    } catch {
      showToast("Failed to delete template.", "error");
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm("Reset all WhatsApp templates to factory defaults?")) return;
    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_defaults" }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Default WhatsApp templates restored!");
        loadTemplates();
      }
    } catch {
      showToast("Failed to reset templates.", "error");
    }
  };

  // Handle Settings Save & Test
  const handleSaveConfig = async () => {
    if (!wabaId.trim() || !phoneNumberId.trim()) {
      showToast("Please enter your WABA ID and Phone Number ID before saving.", "error");
      return;
    }
    if (!accessToken.trim() && !config?.accessTokenMasked) {
      showToast("Please enter your Permanent Access Token before saving.", "error");
      return;
    }

    try {
      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wabaId: wabaId.trim(),
          phoneNumberId: phoneNumberId.trim(),
          apiVersion: apiVersion.trim(),
          accessToken: accessToken.includes("••••") ? undefined : accessToken.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        try {
          localStorage.setItem("ff_whatsapp_client_cache", JSON.stringify({
            wabaId: wabaId.trim(),
            phoneNumberId: phoneNumberId.trim(),
            apiVersion: apiVersion.trim(),
            accessTokenMasked: "••••••••••••••••",
            isConfigured: true,
          }));
        } catch {
          // Ignore
        }
        showToast("WhatsApp Cloud API settings saved!");
        loadConfig();
      } else {
        showToast(json.error?.message || "Failed to save settings.", "error");
      }
    } catch {
      showToast("Network error saving configuration.", "error");
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_connection",
          configOverride: {
            wabaId,
            phoneNumberId,
            apiVersion,
            accessToken: accessToken.includes("••••") ? undefined : accessToken,
          },
        }),
      });

      const json = await res.json();
      setConnectionStatus({
        success: json.success,
        message: json.message || json.error?.message || "Connection test failed.",
      });
    } catch (err: unknown) {
      setConnectionStatus({
        success: false,
        message: err instanceof Error ? err.message : "Connection test failed.",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Handle Send Test WhatsApp
  const handleSendTestMessage = async () => {
    if (!testPhoneTo.trim()) {
      showToast("Please enter a recipient phone number.", "error");
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_test",
          to: testPhoneTo.trim(),
          templateId: testTemplateId || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setTestResult({
          success: true,
          message: json.message || "Test WhatsApp message sent successfully!",
          normalized: json.data?.normalizedPhone,
        });
        showToast("WhatsApp message dispatched!");
        loadLogs();
      } else {
        setTestResult({
          success: false,
          message: json.error?.message || "Failed to send message.",
        });
        showToast(json.error?.message || "Dispatch failed.", "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error sending test message.";
      setTestResult({ success: false, message: msg });
      showToast(msg, "error");
    } finally {
      setSendingTest(false);
    }
  };

  // Live WhatsApp Bubble Preview
  const previewText = useMemo(() => {
    const sampleVars: Record<string, string> = {
      store_name: "Store ERP",
      customer_name: "Alexander Wright",
      customer_phone: "+1 (555) 234-5678",
      order_id: "1058",
      order_total: "295.00",
      order_status: "PROCESSING",
      order_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      product_name: "Kisspeptin 10mg (Pack of 5)",
      tracking_number: "USPS-9400111899562537468219",
    };

    let text = formContent;
    Object.entries(sampleVars).forEach(([k, v]) => {
      text = text.replaceAll(`{${k}}`, v);
    });

    return text;
  }, [formContent]);

  const insertToken = (token: string) => {
    setFormContent((prev) => prev + " " + token);
    showToast(`Inserted ${token}`);
  };

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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
              Phase 2
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Messaging & Alerts
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight flex items-center gap-3">
            <span>💬 WhatsApp Business Integration</span>
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">
            Automated customer order alerts, shipment tracking dispatch, and instant WhatsApp notifications via Meta Cloud API.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl text-xs font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
            title="Restore default templates"
          >
            ↺ Defaults
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>+</span>
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "templates"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>📋 Templates</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === "templates" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
          }`}>
            {templates.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "settings"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>⚙️ Meta API Credentials</span>
          {config?.isConfigured && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "logs"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>📊 Activity Logs</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === "logs" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
          }`}>
            {logStats.total}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("test")}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "test"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>🚀 Test Simulator</span>
        </button>
      </div>

      {/* TAB 1: TEMPLATES */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {templates.map((tpl) => {
            const meta = SCENARIO_LABELS[tpl.scenario] || SCENARIO_LABELS.custom;
            return (
              <div
                key={tpl.id}
                className={`bg-white rounded-3xl border p-5 shadow-2xs transition-all flex flex-col justify-between gap-4 ${
                  tpl.enabled ? "border-slate-200/90 hover:border-slate-300" : "border-slate-200 opacity-60 bg-slate-50/50"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${meta.color}`}>
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleTemplate(tpl.id, tpl.enabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        tpl.enabled ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                      title={tpl.enabled ? "Disable template" : "Enable template"}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          tpl.enabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      {tpl.name}
                    </h3>
                  </div>

                  {/* WhatsApp Chat Bubble Mockup */}
                  <div className="bg-[#efeae2] p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div className="bg-[#dcf8c6] text-slate-900 text-xs font-medium p-3 rounded-xl rounded-tr-none shadow-2xs leading-relaxed whitespace-pre-wrap font-sans">
                      {tpl.content}
                      <div className="text-[10px] text-slate-500 text-right mt-1.5 flex items-center justify-end gap-1 font-mono">
                        <span>12:00 PM</span>
                        <span className="text-emerald-700 font-black">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(tpl)}
                      className="px-3 py-1.5 rounded-xl text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      ✎ Edit
                    </button>
                    <button
                      onClick={() => handleDuplicateTemplate(tpl.id)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Duplicate Template"
                    >
                      ⎘ Copy
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setTestTemplateId(tpl.id);
                      setActiveTab("test");
                    }}
                    className="text-xs font-extrabold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                  >
                    <span>Test Send</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: SETTINGS */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-3xl border-slate-200/80 shadow-2xs">
              <CardHeader>
                <CardTitle className="text-lg font-black text-slate-900">
                  Official Meta WhatsApp Cloud API
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500">
                  Enter your Meta Developers WhatsApp Cloud API credentials. Tokens are encrypted server-side and never exposed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      WhatsApp Business Account ID (WABA ID)
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      name="waba_id_meta"
                      value={wabaId}
                      onChange={(e) => setWabaId(e.target.value)}
                      placeholder="Paste your 15-digit WABA ID"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Phone Number ID
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      name="phone_number_id_meta"
                      value={phoneNumberId}
                      onChange={(e) => setPhoneNumberId(e.target.value)}
                      placeholder="Paste your 15-digit Phone Number ID"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Permanent System User Access Token
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="text-[10px] font-black text-emerald-700 hover:text-emerald-900"
                    >
                      {showToken ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showToken ? "text" : "password"}
                    autoComplete="new-password"
                    name="access_token_meta"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Paste your EAAPZAi... token here"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Graph API Version
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      name="graph_api_version"
                      value={apiVersion}
                      onChange={(e) => setApiVersion(e.target.value)}
                      placeholder="v21.0"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="px-4 py-2.5 rounded-xl text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200 flex items-center justify-center gap-2"
                  >
                    {testingConnection ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin"></span>
                        <span>Verifying with Meta API...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>Test API Connection</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <span>Save API Settings</span>
                  </button>
                </div>

                {connectionStatus && (
                  <div
                    className={`p-4 rounded-2xl border text-xs font-bold ${
                      connectionStatus.success
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-rose-50 text-rose-800 border-rose-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black">
                      <span>{connectionStatus.success ? "✓" : "✕"}</span>
                      <span>{connectionStatus.success ? "Meta Cloud API Verified" : "API Connection Failed"}</span>
                    </div>
                    <p className="mt-1 text-slate-600 font-mono text-[11px]">{connectionStatus.message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-3xl border-slate-200/80 shadow-2xs bg-slate-50/50">
              <CardHeader>
                <CardTitle className="text-sm font-black text-slate-900">
                  Meta Developers Quick Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-600 font-bold">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                  <div className="font-black text-slate-900">1. Meta App Dashboard</div>
                  <div className="text-slate-500 text-[11px]">
                    Create a Business App at developers.facebook.com and add the WhatsApp product.
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                  <div className="font-black text-slate-900">2. System User Token</div>
                  <div className="text-slate-500 text-[11px]">
                    Generate a permanent System User Token with <code>whatsapp_business_messaging</code> permissions.
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                  <div className="font-black text-slate-900">3. Safe Simulation Mode</div>
                  <div className="text-slate-500 text-[11px]">
                    If credentials are blank, test messages run in simulation mode with full log captures.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLogStatusFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                  logStatusFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({logStats.total})
              </button>
              <button
                onClick={() => setLogStatusFilter("sent")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                  logStatusFilter === "sent" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                Sent ({logStats.sentCount})
              </button>
              <button
                onClick={() => setLogStatusFilter("failed")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black ${
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
                placeholder="Search phone or text..."
                className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
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
                No WhatsApp message logs found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Phone</th>
                      <th className="py-3.5 px-4">Message Preview</th>
                      <th className="py-3.5 px-4">Template</th>
                      <th className="py-3.5 px-4">Order</th>
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
                              log.status === "sent"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {log.status === "sent" ? "✓ Sent" : "✕ Failed"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-900">{log.recipientPhone}</td>
                        <td className="py-3 px-4 text-slate-900 max-w-xs truncate">{log.content}</td>
                        <td className="py-3 px-4 text-slate-500">{log.templateName || "Custom"}</td>
                        <td className="py-3 px-4">
                          {log.orderId ? (
                            <Link href={`/orders/${log.orderId}`} className="text-emerald-700 hover:underline">
                              #{log.orderId}
                            </Link>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setActiveLogDetail(log)}
                            className="text-xs font-black text-emerald-700 hover:text-emerald-900"
                          >
                            View
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

      {/* TAB 4: TEST SIMULATOR */}
      {activeTab === "test" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="rounded-3xl border-slate-200/80 shadow-2xs">
              <CardHeader>
                <CardTitle className="text-lg font-black text-slate-900">
                  Send Test WhatsApp Message
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500">
                  Dispatch a real WhatsApp test message to any international phone number with automatic E.164 normalization.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Select Template
                  </label>
                  <select
                    value={testTemplateId}
                    onChange={(e) => setTestTemplateId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({SCENARIO_LABELS[t.scenario]?.label || t.scenario})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Recipient Phone Number (with Country Code)
                  </label>
                  <input
                    type="text"
                    value={testPhoneTo}
                    onChange={(e) => setTestPhoneTo(e.target.value)}
                    placeholder="e.g. +1 555 234 5678 or +880 1712 345678"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">
                    Spaces, dashes, and brackets are automatically cleaned and normalized.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSendTestMessage}
                  disabled={sendingTest}
                  className="w-full py-3 rounded-2xl text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-2 mt-4"
                >
                  {sendingTest ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin"></span>
                      <span>Sending WhatsApp...</span>
                    </>
                  ) : (
                    <>
                      <span>💬</span>
                      <span>Send Test WhatsApp Message</span>
                    </>
                  )}
                </button>

                {testResult && (
                  <div
                    className={`p-4 rounded-2xl border text-xs font-bold ${
                      testResult.success
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-rose-50 text-rose-800 border-rose-200"
                    }`}
                  >
                    <div className="font-black flex items-center gap-2">
                      <span>{testResult.success ? "✓ Sent Successfully" : "✕ Error"}</span>
                    </div>
                    <p className="mt-1 font-mono text-[11px]">{testResult.message}</p>
                    {testResult.normalized && (
                      <p className="mt-1 text-[10px] text-slate-500 font-mono">
                        Normalized E.164: {testResult.normalized}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="rounded-3xl border-slate-200/80 shadow-2xs overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-sm font-black text-slate-900">
                  WhatsApp Screen Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 bg-[#efeae2]">
                {(() => {
                  const tpl = templates.find((t) => t.id === testTemplateId) || templates[0];
                  if (!tpl) return <div className="text-slate-400 text-xs">No template selected.</div>;

                  let text = tpl.content;
                  const sampleVars: Record<string, string> = {
                    store_name: "Store ERP",
                    customer_name: "Alexander Wright",
                    customer_phone: testPhoneTo || "+1 (555) 234-5678",
                    order_id: "1058",
                    order_total: "295.00",
                    order_status: "PROCESSING",
                    order_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                    tracking_number: "USPS-9400111899562537468219",
                  };

                  Object.entries(sampleVars).forEach(([k, v]) => {
                    text = text.replaceAll(`{${k}}`, v);
                  });

                  return (
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="bg-[#dcf8c6] text-slate-900 text-sm p-4 rounded-2xl rounded-tr-none shadow-md leading-relaxed whitespace-pre-wrap font-sans border border-[#cbebb2]">
                        {text}
                        <div className="text-[11px] text-slate-500 text-right mt-2 flex items-center justify-end gap-1 font-mono">
                          <span>Just now</span>
                          <span className="text-emerald-700 font-black">✓✓</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TEMPLATE EDITOR MODAL */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {selectedTemplate ? `Edit: ${selectedTemplate.name}` : "Create WhatsApp Template"}
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  Compose WhatsApp message text with dynamic variable tokens.
                </p>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Order Tracking Update"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Scenario / Event Trigger
                  </label>
                  <select
                    value={formScenario}
                    onChange={(e) => setFormScenario(e.target.value as WhatsAppScenario)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {Object.entries(SCENARIO_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.icon} {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Variable Helper Pills */}
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Click to Insert Dynamic Variable:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLE_HELPERS.map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => insertToken(v.token)}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition-colors border border-slate-200/80"
                      title={v.desc}
                    >
                      {v.token}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                  WhatsApp Message Text
                </label>
                <textarea
                  rows={6}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Hi {customer_name}! Your order #{order_id} has shipped..."
                  className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-sans text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Chat Bubble Live Preview in Editor */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Live Chat Bubble Preview
                </label>
                <div className="bg-[#efeae2] p-4 rounded-2xl border border-slate-200">
                  <div className="bg-[#dcf8c6] text-slate-900 text-xs font-medium p-3.5 rounded-xl rounded-tr-none shadow-2xs leading-relaxed whitespace-pre-wrap">
                    {previewText}
                    <div className="text-[10px] text-slate-500 text-right mt-1.5 flex items-center justify-end gap-1 font-mono">
                      <span>12:00 PM</span>
                      <span className="text-emerald-700 font-black">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              {selectedTemplate && !selectedTemplate.isDefault ? (
                <button
                  type="button"
                  onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                  className="px-3.5 py-2 rounded-xl text-xs font-black text-rose-600 hover:bg-rose-50"
                >
                  Delete Template
                </button>
              ) : (
                <div></div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm"
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOG DETAIL MODAL */}
      {activeLogDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">WhatsApp Dispatch Details</h3>
              <button
                onClick={() => setActiveLogDetail(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-bold text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Status:</span>
                <span className={activeLogDetail.status === "sent" ? "text-emerald-600 font-black" : "text-rose-600 font-black"}>
                  {activeLogDetail.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Recipient Phone:</span>
                <span className="font-mono text-slate-900">{activeLogDetail.recipientPhone}</span>
              </div>
              {activeLogDetail.normalizedPhone && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Normalized (E.164):</span>
                  <span className="font-mono text-slate-900">{activeLogDetail.normalizedPhone}</span>
                </div>
              )}
              {activeLogDetail.messageId && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Meta Message ID:</span>
                  <span className="font-mono text-slate-900 text-[10px] truncate max-w-xs">{activeLogDetail.messageId}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Template:</span>
                <span>{activeLogDetail.templateName || "Custom"}</span>
              </div>
              {activeLogDetail.orderId && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Order ID:</span>
                  <Link href={`/orders/${activeLogDetail.orderId}`} className="text-emerald-700 underline">
                    #{activeLogDetail.orderId}
                  </Link>
                </div>
              )}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-black text-slate-400 mb-1">Message Body</div>
                <div className="font-mono text-slate-800 text-[11px] whitespace-pre-wrap">{activeLogDetail.content}</div>
              </div>
              {activeLogDetail.errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-800 font-mono text-[11px] border border-rose-200">
                  <div className="font-black mb-1">Error ({activeLogDetail.errorCode || "API_ERROR"}):</div>
                  {activeLogDetail.errorMessage}
                </div>
              )}
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
