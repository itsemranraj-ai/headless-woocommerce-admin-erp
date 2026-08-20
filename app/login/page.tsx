"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BrandLogo } from "@/components/ui/brand-logo";

function LoginForm() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/orders";

  const [tab, setTab] = useState<"signin" | "register">("signin");
  const [mode, setMode] = useState<"auth" | "forgot" | "reset" | "success" | "registered">("auth");

  // Sign In State
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register State
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regRole, setRegRole] = useState<"admin" | "staff">("staff");
  const [adminPasscode, setAdminPasscode] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Registered account credentials card state
  const [registeredData, setRegisteredData] = useState<{
    name: string;
    email: string;
    username: string;
    password: string;
    role: string;
  } | null>(null);
  const [showRegisteredPass, setShowRegisteredPass] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Forgot password & reset state
  const [resetIdentifier, setResetIdentifier] = useState("admin");
  const [receivedCode, setReceivedCode] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSuccessMessage, setResetSuccessMessage] = useState("");

  const urlError = searchParams.get("error");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (urlError === "account_deleted") {
      return "Your account has been removed by an administrator. Please contact your admin for access.";
    }
    return null;
  });

  React.useEffect(() => {
    if (urlError === "account_deleted") {
      setError("Your account has been removed by an administrator. Please contact your admin for access.");
    }
  }, [urlError]);

  const handleGenerateStrongPassword = () => {
    const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowercase = "abcdefghijkmnpqrstuvwxyz";
    const numbers = "23456789";
    const symbols = "!@#$%&*";
    const all = uppercase + lowercase + numbers + symbols;
    
    let pass = "";
    pass += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    pass += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    pass += numbers.charAt(Math.floor(Math.random() * numbers.length));
    pass += symbols.charAt(Math.floor(Math.random() * symbols.length));
    
    for (let i = 4; i < 12; i++) {
      pass += all.charAt(Math.floor(Math.random() * all.length));
    }
    
    pass = pass.split("").sort(() => 0.5 - Math.random()).join("");
    
    setRegPassword(pass);
    setRegConfirmPassword(pass);
    setShowRegPassword(true);
    setShowRegConfirmPassword(true);
  };

  // 1. Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setError("Please enter your username/email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginIdentifier.trim(), password: loginPassword }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Invalid credentials.");
      }

      window.location.href = from;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
      setLoading(false);
    }
  };

  // 2. Handle Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regUsername.trim() || !regPassword.trim()) {
      setError("Please fill in all required registration fields.");
      return;
    }

    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match. Please re-check.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          username: regUsername.trim(),
          password: regPassword,
          role: regRole,
          adminPasscode: regRole === "admin" ? adminPasscode.trim() : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create account.");
      }

      // Save to registered data state for instant display & copying
      const data = {
        name: regName.trim(),
        email: regEmail.trim(),
        username: regUsername.trim(),
        password: regPassword,
        role: regRole,
      };
      setRegisteredData(data);
      setMode("registered");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Download credentials as text file
  const downloadCredentials = () => {
    if (!registeredData) return;
    const content = `FIXION FUEL ADMIN PORTAL LOGIN DETAILS\n======================================\nPortal URL: https://demo-erp.itsemranraj.com\nFull Name: ${registeredData.name}\nEmail: ${registeredData.email}\nUsername: ${registeredData.username}\nPassword: ${registeredData.password}\nRole: ${registeredData.role.toUpperCase()}\nDate Created: ${new Date().toLocaleString()}\n======================================\nKeep this file safe and do not share your password.`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `demo-store-credentials-${registeredData.username}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 3. Handle Request Reset Code
  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) {
      setError("Please enter your username or registered email.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail: resetIdentifier.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to send reset code.");
      }

      const code = json.data?.code || "";
      setReceivedCode(code);
      setEnteredOtp(code);
      setMode("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request password reset.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredOtp.trim()) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail: resetIdentifier.trim(),
          otp: enteredOtp.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to reset password.");
      }

      setResetSuccessMessage(json.data?.message || "Password updated successfully!");
      setLoginPassword(newPassword.trim());
      setLoginIdentifier(resetIdentifier.trim());
      setMode("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex items-center justify-center font-sans">
      <Card className="relative max-w-lg w-full border-slate-200/80 bg-white shadow-2xl p-6 sm:p-9 rounded-[32px]">
        {/* Brand Header */}
        <CardHeader className="text-center pb-5">
          <div className="flex justify-center mb-3">
            <BrandLogo className="w-16 h-16" />
          </div>
          <div className="flex justify-center mb-2">
            <StatusBadge status="Live Demo Portal" variant="indigo" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            {mode === "auth"
              ? tab === "signin"
                ? "Sign In to Dashboard"
                : regRole === "staff"
                ? "Register as Sales Rep"
                : "Create Admin Account"
              : mode === "registered"
              ? "Account Created & Saved!"
              : mode === "forgot"
              ? "Forgot Password"
              : mode === "reset"
              ? "Set New Password"
              : "Password Reset Done"}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            {mode === "auth"
              ? tab === "signin"
                ? "Enter your credentials to access live WooCommerce orders"
                : regRole === "staff"
                ? "Register a new Field Sales Rep account for taking orders & showcase"
                : "Register a new administrator account with master passcode"
              : mode === "registered"
              ? "Your login username and password are saved and ready"
              : mode === "forgot"
              ? "Enter your registered username or email to get a reset code"
              : mode === "reset"
              ? "Enter the verification code and your new password"
              : "Your new administrator password has been saved"}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {/* Error Message Box */}
          {error && (
            <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs sm:text-sm text-rose-800 font-bold flex items-center gap-2.5">
              <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* MODE: AUTH (Sign In or Register) */}
          {mode === "auth" && (
            <div className="space-y-5">
              {/* Tab Selector: Sign In vs Register */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs sm:text-sm font-extrabold">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setTab("signin");
                  }}
                  className={`py-2.5 rounded-xl transition-all ${
                    tab === "signin"
                      ? "bg-white text-[#18181B] shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setTab("register");
                  }}
                  className={`py-2.5 rounded-xl transition-all ${
                    tab === "register"
                      ? "bg-white text-[#18181B] shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Create Account (Register)
                </button>
              </div>

              {/* TAB 1: Sign In Form */}
              {tab === "signin" && (
                <form onSubmit={handleLoginSubmit} autoComplete="on" className="space-y-4">
                  {/* Quick Demo Credentials Box */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                        <span className="text-amber-500">⚡</span> Quick Demo Access
                      </span>
                      <span className="text-[10px] font-extrabold text-indigo-600">Click to Auto-Fill</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginIdentifier("admin");
                          setLoginPassword("admin123");
                          setError(null);
                        }}
                        className="p-2.5 rounded-xl bg-white border border-indigo-200/80 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left group shadow-2xs active:scale-98 cursor-pointer"
                      >
                        <div className="flex items-center gap-1 text-[11px] font-black text-slate-900 group-hover:text-indigo-600">
                          <span>👑</span> Administrator
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5 font-mono">
                          admin / admin123
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLoginIdentifier("salesrep");
                          setLoginPassword("sales123");
                          setError(null);
                        }}
                        className="p-2.5 rounded-xl bg-white border border-indigo-200/80 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left group shadow-2xs active:scale-98 cursor-pointer"
                      >
                        <div className="flex items-center gap-1 text-[11px] font-black text-slate-900 group-hover:text-indigo-600">
                          <span>💼</span> Sales Rep
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5 font-mono">
                          salesrep / sales123
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Username or Email
                    </label>
                    <input
                      type="text"
                      name="username"
                      id="signin-username"
                      autoComplete="username"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="admin or your email"
                      disabled={loading}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-extrabold text-slate-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setResetIdentifier(loginIdentifier.trim() || "admin");
                          setMode("forgot");
                        }}
                        className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? "text" : "password"}
                        name="password"
                        id="signin-password"
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••••"
                        disabled={loading}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-11 py-3 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-0.5"
                        title={showLoginPassword ? "Hide password" : "Show password"}
                      >
                        {showLoginPassword ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 inline-flex justify-center items-center gap-2 px-5 py-3.5 text-xs sm:text-sm font-black rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all disabled:opacity-50 shadow-md active:scale-98"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <span>Sign In to Dashboard</span>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 2: Dynamic User Registration Form with Semantic AutoComplete for Browser Password Saving */}
              {tab === "register" && (
                <form onSubmit={handleRegisterSubmit} autoComplete="on" className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="reg-name"
                      autoComplete="name"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Emran Raj"
                      disabled={loading}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="reg-email"
                        autoComplete="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="your@email.com"
                        disabled={loading}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1">
                        Choose Username <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="username"
                        id="reg-username"
                        autoComplete="username"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="e.g. emran"
                        disabled={loading}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-extrabold text-slate-700">
                          Password <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleGenerateStrongPassword}
                          className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                          title="Generate a strong random password"
                        >
                          <span>✨ Suggest Password</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showRegPassword ? "text" : "password"}
                          name="password"
                          id="reg-password"
                          autoComplete="new-password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="At least 6 chars"
                          disabled={loading}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-11 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                          title={showRegPassword ? "Hide password" : "Show password"}
                        >
                          {showRegPassword ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1">
                        Confirm Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showRegConfirmPassword ? "text" : "password"}
                          name="confirm_password"
                          id="reg-confirm-password"
                          autoComplete="new-password"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Re-type password"
                          disabled={loading}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-11 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                          className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                          title={showRegConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showRegConfirmPassword ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Account Role
                    </label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as "admin" | "staff")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 cursor-pointer"
                    >
                      <option value="staff">Sales Rep (Field Orders & Customer Showcase)</option>
                      <option value="admin">Administrator (Full Store & Catalog Access)</option>
                    </select>
                  </div>

                  {regRole === "admin" && (
                    <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-1.5 animate-in fade-in duration-150">
                      <label className="block text-xs font-extrabold text-amber-950">
                        Master Admin Passcode <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={adminPasscode}
                        onChange={(e) => setAdminPasscode(e.target.value)}
                        placeholder="Enter Master Admin Passcode"
                        required
                        className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                      <p className="text-[10px] text-amber-800 font-medium">
                        🔒 Security verification: Master Admin Passcode is required to register with full administrator access.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 inline-flex justify-center items-center gap-2 px-5 py-3.5 text-xs sm:text-sm font-black rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all disabled:opacity-50 shadow-md active:scale-98"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <span>Create Account & Save Details</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* MODE: REGISTERED SUCCESS WITH CREDENTIALS SAVING & COPY */}
          {mode === "registered" && registeredData && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-black text-sm text-emerald-900">
                    Account Created Successfully!
                  </span>
                </div>
                <p className="text-emerald-800 text-[11px]">
                  Your credentials have been securely stored in the portal database. You can save or copy them below for future logins.
                </p>
              </div>

              {/* Credentials Summary Box with 1-Click Copy */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                {/* Username Row */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Username / Login ID
                    </span>
                    <span className="font-mono font-black text-sm text-slate-900">
                      {registeredData.username}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(registeredData.username, "username")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all active:scale-95 shadow-2xs"
                  >
                    {copiedField === "username" ? (
                      <span className="text-emerald-600 font-extrabold">✓ Copied</span>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Password Row */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Password
                    </span>
                    <span className="font-mono font-black text-sm text-slate-900">
                      {showRegisteredPass ? registeredData.password : "••••••••••••"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRegisteredPass(!showRegisteredPass)}
                      className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all text-xs"
                      title={showRegisteredPass ? "Hide" : "Show"}
                    >
                      {showRegisteredPass ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(registeredData.password, "password")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all active:scale-95 shadow-2xs"
                    >
                      {copiedField === "password" ? (
                        <span className="text-emerald-600 font-extrabold">✓ Copied</span>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Role & Name */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 font-medium">Assigned Role:</span>
                  <span className="font-extrabold uppercase text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                    {registeredData.role}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = from;
                  }}
                  className="w-full inline-flex justify-center items-center gap-2 px-5 py-3.5 text-xs sm:text-sm font-black rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all shadow-md active:scale-98"
                >
                  <span>Continue to Dashboard →</span>
                </button>

                <button
                  type="button"
                  onClick={downloadCredentials}
                  className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 transition-colors shadow-2xs active:scale-98"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Save / Download Login Info (.txt)</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: Forgot Password - Request OTP */}
          {mode === "forgot" && (
            <form onSubmit={handleRequestResetCode} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Admin Username or Email
                </label>
                <input
                  type="text"
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  placeholder="admin or your email"
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
                  required
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900 font-medium">
                💡 Enter your registered username or email to generate an instant 6-digit recovery code.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center items-center gap-2 px-5 py-3 text-xs sm:text-sm font-black rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all disabled:opacity-50 shadow-md active:scale-98"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating Code...</span>
                  </>
                ) : (
                  <span>Generate Reset Code</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("auth");
                }}
                className="w-full text-center text-xs font-extrabold text-slate-600 hover:text-slate-900 pt-2 transition-colors"
              >
                ← Back to Sign In
              </button>
            </form>
          )}

          {/* MODE 3: Enter OTP & Set New Password */}
          {mode === "reset" && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              {receivedCode && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-medium flex items-center justify-between">
                  <div>
                    <span className="font-extrabold block text-emerald-900">Your Recovery Code:</span>
                    <span className="font-mono font-black text-base tracking-widest text-emerald-700">{receivedCode}</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                    Valid for 15m
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value)}
                  placeholder="e.g. 849201"
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-mono font-black tracking-widest text-slate-900 text-center focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center items-center gap-2 px-5 py-3 text-xs sm:text-sm font-black rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all disabled:opacity-50 shadow-md active:scale-98"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Save New Password</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("forgot");
                }}
                className="w-full text-center text-xs font-extrabold text-slate-600 hover:text-slate-900 pt-1 transition-colors"
              >
                ← Request New Code
              </button>
            </form>
          )}

          {/* MODE 4: Reset Success */}
          {mode === "success" && (
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 font-semibold space-y-1">
                <div className="text-emerald-700 text-2xl mb-1 font-black">✓</div>
                <p className="font-extrabold text-sm text-emerald-900">
                  {resetSuccessMessage}
                </p>
                <p className="text-emerald-800">
                  Your new administrator password has been activated.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLoginSubmit}
                disabled={loading}
                className="w-full inline-flex justify-center items-center gap-2 px-5 py-3.5 text-xs sm:text-sm font-black rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all shadow-md active:scale-98"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In Directly Now</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("auth");
                  setTab("signin");
                }}
                className="text-xs font-extrabold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Back to Sign In Form
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-[11px] text-slate-500 font-medium">
            Dedicated application portal for <span className="text-slate-800 font-mono font-bold">itsemranraj.com/sss</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-6 min-h-[50vh]">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
