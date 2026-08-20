"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { EmailConfig, EmailTemplate, EmailLog, EmailScenario } from "@/types/email";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

const SCENARIO_LABELS: Record<EmailScenario, { label: string; color: string; icon: string }> = {
  new_order: { label: "New Order", color: "bg-blue-50 text-blue-700 border-blue-200", icon: "📦" },
  order_processing: { label: "Processing", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: "⚙️" },
  order_completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "✓" },
  order_cancelled: { label: "Cancelled", color: "bg-rose-50 text-rose-700 border-rose-200", icon: "✕" },
  order_refunded: { label: "Refunded", color: "bg-slate-50 text-slate-700 border-slate-200", icon: "↩" },
  payment_failed: { label: "Payment Failed", color: "bg-amber-50 text-amber-700 border-amber-200", icon: "⚠️" },
  payment_completed: { label: "Payment Received", color: "bg-teal-50 text-teal-700 border-teal-200", icon: "💳" },
  low_stock: { label: "Low Stock Alert", color: "bg-yellow-50 text-yellow-800 border-yellow-200", icon: "📉" },
  out_of_stock: { label: "Out of Stock Alert", color: "bg-red-50 text-red-700 border-red-200", icon: "🚨" },
  custom: { label: "Custom Template", color: "bg-purple-50 text-purple-700 border-purple-200", icon: "✉️" },
};

const VARIABLE_HELPERS = [
  { token: "{customer_name}", desc: "Customer Full Name" },
  { token: "{customer_email}", desc: "Customer Email Address" },
  { token: "{customer_phone}", desc: "Customer Phone Number" },
  { token: "{order_id}", desc: "WooCommerce Order ID" },
  { token: "{order_total}", desc: "Order Total ($)" },
  { token: "{order_status}", desc: "Current Status" },
  { token: "{order_date}", desc: "Formatted Order Date" },
  { token: "{product_name}", desc: "First Product Name" },
  { token: "{product_quantity}", desc: "Product Item Quantity" },
  { token: "{store_name}", desc: "Store Name (Store ERP)" },
  { token: "{tracking_number}", desc: "Shipment Tracking ID" },
  { token: "{billing_address}", desc: "Customer Billing Address" },
  { token: "{shipping_address}", desc: "Customer Shipping Address" },
];

export default function EmailNotificationsPage() {
  const [activeTab, setActiveTab] = useState<"templates" | "settings" | "logs" | "test">("templates");

  // State: Templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Template Form
  const [formName, setFormName] = useState("");
  const [formScenario, setFormScenario] = useState<EmailScenario>("new_order");
  const [formSubject, setFormSubject] = useState("");
  const [formHtml, setFormHtml] = useState("");
  const [formText, setFormText] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);
  const [editorTab, setEditorTab] = useState<"code" | "preview">("preview");

  // State: Settings
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);

  // State: Logs
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logStatusFilter, setLogStatusFilter] = useState("all");
  const [logSearch, setLogSearch] = useState("");
  const [logStats, setLogStats] = useState({ total: 0, successCount: 0, failedCount: 0 });
  const [activeLogDetail, setActiveLogDetail] = useState<EmailLog | null>(null);

  // State: Test Email
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testTemplateId, setTestTemplateId] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Notification Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Load Data
  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const res = await fetch("/api/email/templates");
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
      const res = await fetch("/api/email/config");
      const json = await res.json();
      if (json.success && json.data) {
        let finalHost = json.data.smtpHost || "";
        let finalUser = json.data.smtpUser || "";
        let finalSenderEmail = json.data.senderEmail || "";
        let finalSenderName = json.data.senderName || "";
        let finalPort = json.data.smtpPort || 587;
        let finalSecure = Boolean(json.data.smtpSecure);
        let finalPass = json.data.smtpPasswordMasked || "";
        let isConfig = json.data.isConfigured;

        if (!finalHost || !finalUser) {
          try {
            const cached = localStorage.getItem("ff_email_client_cache");
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed.smtpHost) finalHost = parsed.smtpHost;
              if (parsed.smtpUser) finalUser = parsed.smtpUser;
              if (parsed.senderEmail) finalSenderEmail = parsed.senderEmail;
              if (parsed.senderName) finalSenderName = parsed.senderName;
              if (parsed.smtpPort) finalPort = parsed.smtpPort;
              if (parsed.smtpSecure !== undefined) finalSecure = parsed.smtpSecure;
              if (parsed.smtpPasswordMasked) finalPass = parsed.smtpPasswordMasked;
              if (parsed.isConfigured) isConfig = true;
            }
          } catch {
            // Ignore
          }
        }

        setConfig({ ...json.data, smtpHost: finalHost, smtpUser: finalUser, senderEmail: finalSenderEmail, senderName: finalSenderName, isConfigured: isConfig });
        setSenderName(finalSenderName);
        setSenderEmail(finalSenderEmail);
        setSmtpHost(finalHost);
        setSmtpPort(finalPort);
        setSmtpSecure(finalSecure);
        setSmtpUser(finalUser);
        setSmtpPassword(finalPass);
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

      const res = await fetch(`/api/email/logs?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setLogs(json.data.logs || []);
        setLogStats({
          total: json.data.total || 0,
          successCount: json.data.successCount || 0,
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
    setFormSubject("Order #{order_id} Update - {store_name}");
    setFormHtml(
      `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 12px;">\n  <h2>Hi {customer_name},</h2>\n  <p>Thank you for your order #{order_id} of \${order_total}.</p>\n</div>`
    );
    setFormText("Hi {customer_name},\n\nThank you for your order #{order_id} (${order_total}).\n\n{store_name}");
    setFormEnabled(true);
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = (tpl: EmailTemplate) => {
    setSelectedTemplate(tpl);
    setFormName(tpl.name);
    setFormScenario(tpl.scenario);
    setFormSubject(tpl.subject);
    setFormHtml(tpl.bodyHtml);
    setFormText(tpl.bodyText || "");
    setFormEnabled(tpl.enabled);
    setIsEditorOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!formName.trim() || !formSubject.trim() || !formHtml.trim()) {
      showToast("Please fill in template name, subject, and HTML body.", "error");
      return;
    }

    try {
      const res = await fetch("/api/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selectedTemplate ? "update" : "create",
          id: selectedTemplate?.id,
          templateData: {
            name: formName,
            scenario: formScenario,
            subject: formSubject,
            bodyHtml: formHtml,
            bodyText: formText,
            enabled: formEnabled,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(selectedTemplate ? "Template updated successfully!" : "Template created successfully!");
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
      const res = await fetch("/api/email/templates", {
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
      showToast("Failed to toggle template status.", "error");
    }
  };

  const handleDuplicateTemplate = async (id: string) => {
    try {
      const res = await fetch("/api/email/templates", {
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
    if (!confirm("Are you sure you want to delete this email template?")) return;
    try {
      const res = await fetch("/api/email/templates", {
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
    if (!confirm("Reset all email templates to initial factory defaults?")) return;
    try {
      const res = await fetch("/api/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_defaults" }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Default templates restored!");
        loadTemplates();
      }
    } catch {
      showToast("Failed to restore templates.", "error");
    }
  };

  // Handle Settings Save & Test
  const handleSaveConfig = async () => {
    try {
      const res = await fetch("/api/email/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName,
          senderEmail,
          smtpHost,
          smtpPort,
          smtpSecure,
          smtpUser,
          smtpPassword: smtpPassword.includes("••••") ? undefined : smtpPassword,
        }),
      });

      const json = await res.json();
      if (json.success) {
        try {
          localStorage.setItem("ff_email_client_cache", JSON.stringify({
            smtpHost: smtpHost.trim(),
            smtpPort,
            smtpSecure,
            smtpUser: smtpUser.trim(),
            senderEmail: senderEmail.trim(),
            senderName: senderName.trim(),
            smtpPasswordMasked: "••••••••••••",
            isConfigured: true,
          }));
        } catch {
          // Ignore
        }
        showToast("Email configuration saved!");
        loadConfig();
      } else {
        showToast(json.error?.message || "Failed to save configuration.", "error");
      }
    } catch {
      showToast("Network error saving configuration.", "error");
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_connection",
          configOverride: {
            smtpHost,
            smtpPort,
            smtpSecure,
            smtpUser,
            smtpPassword: smtpPassword.includes("••••") ? undefined : smtpPassword,
            senderEmail,
          },
        }),
      });

      const json = await res.json();
      setConnectionStatus({
        success: json.success,
        message: json.message || json.error?.message || "Connection failed.",
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

  // Handle Send Test Email
  const handleSendTestEmail = async () => {
    if (!testEmailTo.trim() || !testEmailTo.includes("@")) {
      showToast("Please enter a valid recipient test email.", "error");
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_test",
          to: testEmailTo.trim(),
          templateId: testTemplateId || undefined,
          configOverride: {
            smtpHost,
            smtpPort,
            smtpSecure,
            smtpUser,
            smtpPassword: smtpPassword.includes("••••") ? undefined : smtpPassword,
            senderEmail,
            senderName,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        setTestResult({
          success: true,
          message: json.message || "Test email dispatched successfully!",
        });
        showToast("Test email sent!");
        loadLogs();
      } else {
        setTestResult({
          success: false,
          message: json.error?.message || "Failed to dispatch test email.",
        });
        showToast(json.error?.message || "Send failed.", "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error dispatching test email.";
      setTestResult({ success: false, message: msg });
      showToast(msg, "error");
    } finally {
      setSendingTest(false);
    }
  };

  // Interpolated Preview for Editor
  const previewData = useMemo(() => {
    const sampleVars: Record<string, string> = {
      store_name: "Store ERP",
      customer_name: "Alexander Wright",
      customer_email: "alexander@example.com",
      customer_phone: "+1 (555) 234-5678",
      order_id: "1058",
      order_total: "295.00",
      order_status: "PROCESSING",
      order_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      product_name: "Kisspeptin 10mg (Pack of 5)",
      product_quantity: "2",
      tracking_number: "USPS-9400111899562537468219",
      billing_address: "742 Evergreen Terrace, Springfield, OR 97477, US",
      shipping_address: "742 Evergreen Terrace, Springfield, OR 97477, US",
    };

    let subject = formSubject;
    let html = formHtml;

    Object.entries(sampleVars).forEach(([k, v]) => {
      subject = subject.replaceAll(`{${k}}`, v);
      html = html.replaceAll(`{${k}}`, v);
    });

    return { subject, html };
  }, [formSubject, formHtml]);

  // Insert token into HTML editor
  const insertToken = (token: string) => {
    setFormHtml((prev) => prev + " " + token);
    showToast(`Inserted ${token} into template`);
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
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
              Phase 2
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Transactional Email Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight flex items-center gap-3">
            <span>✉️ Customer Email Notifications</span>
          </h1>
          <p className="text-sm font-bold text-slate-500 mt-1">
            Automate branded HTML order receipts, status dispatches, and PDF invoices via Resend or SMTP.
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
            className="px-4 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>+</span>
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* Modern Tab Bar */}
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
          <span>⚙️ Resend / SMTP Config</span>
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
          <span>📊 Delivery Logs</span>
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
        <div className="space-y-6">
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

                      <div className="flex items-center gap-2">
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
                    </div>

                    <div>
                      <h3 className="text-base font-black text-slate-900 tracking-tight line-clamp-1">
                        {tpl.name}
                      </h3>
                      <p className="text-xs font-mono font-bold text-slate-500 mt-1 line-clamp-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        {tpl.subject}
                      </p>
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
                      className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <span>Preview / Test</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: SETTINGS & SMTP */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-3xl border-slate-200/80 shadow-2xs">
              <CardHeader>
                <CardTitle className="text-lg font-black text-slate-900">
                  SMTP Server Credentials
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500">
                  Configure your outbound mail server. Passwords are encrypted and never exposed to client-side code.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Sender Name
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Store ERP Order Desk"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Sender Email (From)
                    </label>
                    <input
                      type="email"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="orders@itsemranraj.com/sss"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.hostinger.com or smtp.gmail.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Port
                    </label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 587;
                        setSmtpPort(val);
                        if (val === 465) setSmtpSecure(true);
                        if (val === 587 || val === 25) setSmtpSecure(false);
                      }}
                      placeholder="587 or 465"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      SMTP Username
                    </label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="user@itsemranraj.com/sss"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                        SMTP Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smtpSecure}
                      onChange={(e) => setSmtpSecure(e.target.checked)}
                      className="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-extrabold text-slate-700">
                      Use SSL/TLS direct handshake (Required for Port 465)
                    </span>
                  </label>
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
                        <span>Testing Handshake...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>Test Connection</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-slate-900 hover:bg-black transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <span>Save Settings</span>
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
                      <span>{connectionStatus.success ? "Connection Verified" : "Connection Test Failed"}</span>
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
                  SMTP Setup Quick Reference
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-600 font-bold">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                  <div className="font-black text-slate-900">Hostinger Business Email</div>
                  <div className="text-slate-500 font-mono text-[11px]">Host: smtp.hostinger.com</div>
                  <div className="text-slate-500 font-mono text-[11px]">Port: 465 (SSL) or 587 (TLS)</div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                  <div className="font-black text-slate-900">Google Workspace / Gmail</div>
                  <div className="text-slate-500 font-mono text-[11px]">Host: smtp.gmail.com</div>
                  <div className="text-slate-500 font-mono text-[11px]">Port: 587 | Use App Password</div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                  <div className="font-black text-slate-900">Zero-Config Simulation</div>
                  <div className="text-slate-500 text-[11px]">
                    If SMTP fields are empty, the engine operates in safe simulated mode, logging every test execution cleanly without failing.
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
          {/* Filter Bar */}
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
                onClick={() => setLogStatusFilter("success")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black ${
                  logStatusFilter === "success" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                Success ({logStats.successCount})
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
                placeholder="Search recipient or subject..."
                className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                onClick={loadLogs}
                className="px-3 py-1.5 rounded-xl text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {logs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-sm">
                No email dispatch logs found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Recipient</th>
                      <th className="py-3.5 px-4">Subject</th>
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
                              log.status === "success"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {log.status === "success" ? "✓ Sent" : "✕ Failed"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-900">{log.recipient}</td>
                        <td className="py-3 px-4 text-slate-900 max-w-xs truncate">{log.subject}</td>
                        <td className="py-3 px-4 text-slate-500">{log.templateName || "Custom"}</td>
                        <td className="py-3 px-4">
                          {log.orderId ? (
                            <Link href={`/orders/${log.orderId}`} className="text-indigo-600 hover:underline">
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
                            className="text-xs font-black text-indigo-600 hover:text-indigo-800"
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
                  Send Live Test Email
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500">
                  Test template rendering and SMTP delivery directly to your inbox using real store mock parameters.
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
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
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
                    Recipient Test Email
                  </label>
                  <input
                    type="email"
                    value={testEmailTo}
                    onChange={(e) => setTestEmailTo(e.target.value)}
                    placeholder="your-email@gmail.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={sendingTest}
                  className="w-full py-3 rounded-2xl text-sm font-black text-white bg-slate-900 hover:bg-black transition-all shadow-md flex items-center justify-center gap-2 mt-4"
                >
                  {sendingTest ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin"></span>
                      <span>Dispatching Email...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Send Live Test Email</span>
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
                      <span>{testResult.success ? "✓ Success" : "✕ Error"}</span>
                    </div>
                    <p className="mt-1 font-mono text-[11px]">{testResult.message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="rounded-3xl border-slate-200/80 shadow-2xs overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-sm font-black text-slate-900">
                  Rendered Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {(() => {
                  const tpl = templates.find((t) => t.id === testTemplateId) || templates[0];
                  if (!tpl) return <div className="text-slate-400 text-xs">No template selected.</div>;

                  let subject = tpl.subject;
                  let html = tpl.bodyHtml;
                  const sampleVars: Record<string, string> = {
                    store_name: "Store ERP",
                    customer_name: "Alexander Wright",
                    customer_email: testEmailTo || "alexander@example.com",
                    customer_phone: "+1 (555) 234-5678",
                    order_id: "1058",
                    order_total: "295.00",
                    order_status: "PROCESSING",
                    order_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                    product_name: "Kisspeptin 10mg (Pack of 5)",
                    product_quantity: "2",
                    tracking_number: "USPS-9400111899562537468219",
                  };

                  Object.entries(sampleVars).forEach(([k, v]) => {
                    subject = subject.replaceAll(`{${k}}`, v);
                    html = html.replaceAll(`{${k}}`, v);
                  });

                  return (
                    <div className="space-y-3">
                      <div className="p-2.5 bg-slate-100 rounded-xl text-xs font-mono text-slate-800">
                        <span className="text-slate-400 font-bold">Subject: </span>
                        {subject}
                      </div>
                      <div
                        className="rounded-2xl border border-slate-200 overflow-hidden max-h-96 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
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
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {selectedTemplate ? `Edit: ${selectedTemplate.name}` : "Create Email Template"}
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  Design rich HTML templates with dynamic variable tokens.
                </p>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
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
                    placeholder="e.g. Order Delivery Notice"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Scenario / Event Trigger
                  </label>
                  <select
                    value={formScenario}
                    onChange={(e) => setFormScenario(e.target.value as EmailScenario)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {Object.entries(SCENARIO_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.icon} {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="Order #{order_id} update from {store_name}"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
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
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 transition-colors border border-slate-200/80"
                      title={v.desc}
                    >
                      {v.token}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code vs Live Preview Switcher */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Email HTML Content
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setEditorTab("code")}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                        editorTab === "code" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                      }`}
                    >
                      &lt;/&gt; Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab("preview")}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                        editorTab === "preview" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                      }`}
                    >
                      👁 Live Preview
                    </button>
                  </div>
                </div>

                {editorTab === "code" ? (
                  <textarea
                    rows={12}
                    value={formHtml}
                    onChange={(e) => setFormHtml(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    placeholder="<div>HTML Content</div>"
                  />
                ) : (
                  <div
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50 max-h-80 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: previewData.html }}
                  />
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              {selectedTemplate && !selectedTemplate.isDefault ? (
                <button
                  type="button"
                  onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                  className="px-3.5 py-2 rounded-xl text-xs font-black text-rose-600 hover:bg-rose-50 transition-colors"
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
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-slate-900 hover:bg-black transition-all shadow-sm"
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
              <h3 className="text-base font-black text-slate-900">Email Delivery Details</h3>
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
                <span className={activeLogDetail.status === "success" ? "text-emerald-600 font-black" : "text-rose-600 font-black"}>
                  {activeLogDetail.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Recipient:</span>
                <span className="font-mono text-slate-900">{activeLogDetail.recipient}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Subject:</span>
                <span className="text-slate-900 text-right">{activeLogDetail.subject}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Template:</span>
                <span>{activeLogDetail.templateName || "Custom"}</span>
              </div>
              {activeLogDetail.orderId && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Order ID:</span>
                  <Link href={`/orders/${activeLogDetail.orderId}`} className="text-indigo-600 underline">
                    #{activeLogDetail.orderId}
                  </Link>
                </div>
              )}
              {activeLogDetail.errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-800 font-mono text-[11px] border border-rose-200">
                  <div className="font-black mb-1">Error Trace:</div>
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
