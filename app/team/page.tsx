"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface UserItem {
  id: string;
  name: string;
  email: string;
  username: string;
  role: "admin" | "manager" | "staff";
  createdAt: string;
}

function TeamManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<"all" | "staff" | "admin">(
    roleParam === "staff" ? "staff" : roleParam === "admin" ? "admin" : "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Master Passcode State
  const [masterPasscode, setMasterPasscode] = useState("FixionFuel@Admin2026#");
  const [isEditingPasscode, setIsEditingPasscode] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [isSavingPasscode, setIsSavingPasscode] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "staff">("staff");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password reset modal
  const [resetTargetUser, setResetTargetUser] = useState<UserItem | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Delete modal
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (roleParam === "staff") setSelectedRoleFilter("staff");
    else if (roleParam === "admin") setSelectedRoleFilter("admin");
  }, [roleParam]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Check current session
      const sessionRes = await fetch("/api/auth/session");
      const sessionJson = await sessionRes.json();
      if (!sessionJson.data?.authenticated) {
        router.push("/login?from=/team");
        return;
      }

      if (sessionJson.data?.user?.role === "staff") {
        router.push("/orders");
        return;
      }

      setCurrentUserRole(sessionJson.data?.user?.role || "admin");

      const [usersRes, passRes] = await Promise.allSettled([
        fetch("/api/auth/users").then((r) => r.json()),
        fetch("/api/auth/master-passcode").then((r) => r.json()),
      ]);

      if (usersRes.status === "fulfilled" && usersRes.value.success && Array.isArray(usersRes.value.data)) {
        setUsers(usersRes.value.data);
      }
      if (passRes.status === "fulfilled" && passRes.value.success && passRes.value.data?.passcode) {
        setMasterPasscode(passRes.value.data.passcode);
      }
    } catch {
      showToast("Failed to load team members.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMasterPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcodeInput.trim() || passcodeInput.trim().length < 4) {
      showToast("Passcode must be at least 4 characters.", "error");
      return;
    }

    setIsSavingPasscode(true);
    try {
      const res = await fetch("/api/auth/master-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcodeInput.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update passcode.");
      }

      setMasterPasscode(json.data.passcode);
      setIsEditingPasscode(false);
      setPasscodeInput("");
      showToast("Master Admin Passcode updated successfully!");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error saving passcode.", "error");
    } finally {
      setIsSavingPasscode(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [router]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          username: newUsername.trim(),
          email: newEmail.trim() || undefined,
          password: newPassword,
          role: newRole,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create user.");
      }

      setUsers((prev) => [...prev, json.data]);
      showToast(`User account for "${newName}" created successfully!`);
      setIsAddModalOpen(false);
      setNewName("");
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("staff");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error creating user.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !resetPasswordInput.trim()) return;

    setIsResetting(true);
    try {
      const res = await fetch(`/api/auth/users/${resetTargetUser.username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: resetPasswordInput }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update password.");
      }

      showToast(`Password updated for ${resetTargetUser.username}!`);
      setResetTargetUser(null);
      setResetPasswordInput("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error updating password.", "error");
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/auth/users/${deleteTargetUser.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to delete user.");
      }

      setUsers((prev) =>
        prev.filter(
          (u) =>
            u.id !== deleteTargetUser.id &&
            u.username.toLowerCase() !== deleteTargetUser.username.toLowerCase()
        )
      );
      showToast(`User "${deleteTargetUser.name || deleteTargetUser.username}" removed.`);
      setDeleteTargetUser(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error deleting user.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const staffCount = users.filter((u) => u.role === "staff").length;
  const adminCount = users.filter((u) => u.role === "admin").length;

  const filteredUsers = users.filter((u) => {
    if (selectedRoleFilter === "staff" && u.role !== "staff") return false;
    if (selectedRoleFilter === "admin" && u.role !== "admin") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 w-full px-4 sm:px-8 lg:px-10 py-5 sm:py-8 flex flex-col gap-6 sm:gap-8 font-sans pb-28 lg:pb-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-black transition-all animate-in slide-in-from-top duration-200 ${
            toastMessage.type === "success"
              ? "bg-slate-900 text-white border-slate-700"
              : "bg-rose-600 text-white border-rose-700"
          }`}
        >
          <span>{toastMessage.type === "success" ? "✓" : "⚠️"}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#eaedf2]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#18181b]">
              Team & Sales Representatives
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-black">
              Role Access Control
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage store administrators and sales representatives with restricted order-taking permissions.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-extrabold rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all shadow-md active:scale-95 w-full sm:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Team Member</span>
        </button>
      </div>

      {/* Role Comparison Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Administrator Role Card */}
        <div className="p-5 rounded-3xl bg-slate-900 text-white flex flex-col justify-between gap-3 shadow-sm border border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">👑</span>
              <h3 className="font-extrabold text-sm sm:text-base">Administrator Role</h3>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Full unrestricted access across all store systems: Dashboard metrics, Product Catalog & Pricing, Category & Tag Manager, Team Accounts, and Webhook Alerts.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-[11px] font-bold text-slate-400">
            <span>✓ Complete Store Control</span>
            <span>•</span>
            <span>✓ Product & Catalog Edit</span>
          </div>
        </div>

        {/* Sales Rep Role Card */}
        <div className="p-5 rounded-3xl bg-amber-50/70 border border-amber-200/80 text-amber-950 flex flex-col justify-between gap-3 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">💼</span>
              <h3 className="font-extrabold text-sm sm:text-base text-amber-950">Sales Rep (Field Agent)</h3>
            </div>
            <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
              Dedicated field sales mode: Can take orders, view live Orders Stream, and browse the Visual Showcase for customers. <strong>Cannot edit products, categories, or store metrics.</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60 text-[11px] font-bold text-amber-800">
            <span>✓ Field Orders & Catalog</span>
            <span>•</span>
            <span>🔒 Settings Restricted</span>
          </div>
        </div>
      </div>

      {/* Master Security Key Info for Owner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-100/90 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white text-slate-900 border border-slate-200 flex items-center justify-center text-xl font-black shrink-0">
            🔑
          </div>
          <div>
            <div className="text-xs sm:text-sm font-black text-slate-900">
              Master Admin Registration Passcode
            </div>
            <p className="text-[11px] text-slate-500">
              Share this secret key only with partners who need full Administrator permissions during registration.
            </p>
          </div>
        </div>

        {isEditingPasscode ? (
          <form onSubmit={handleUpdateMasterPasscode} className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              required
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              placeholder="New Passcode (min 4 chars)"
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
            <button
              type="submit"
              disabled={isSavingPasscode}
              className="px-3.5 py-1.5 bg-[#18181B] hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
            >
              {isSavingPasscode ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditingPasscode(false)}
              className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-white px-3.5 py-2 rounded-2xl border border-slate-200 flex items-center gap-2">
              <code className="text-xs font-mono font-black text-slate-900 select-all">
                {masterPasscode}
              </code>
            </div>
            <button
              type="button"
              onClick={() => {
                setPasscodeInput(masterPasscode);
                setIsEditingPasscode(true);
              }}
              className="px-3 py-2 text-xs font-bold rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all shadow-2xs"
            >
              ✏️ Change Passcode
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Role Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedRoleFilter("all")}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
              selectedRoleFilter === "all"
                ? "bg-[#18181B] text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            All Accounts ({users.length})
          </button>
          <button
            onClick={() => setSelectedRoleFilter("staff")}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 ${
              selectedRoleFilter === "staff"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-100/70 hover:bg-amber-100 text-amber-950 border border-amber-300/60"
            }`}
          >
            <span>💼</span>
            <span>Sales Reps ({staffCount})</span>
          </button>
          <button
            onClick={() => setSelectedRoleFilter("admin")}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 ${
              selectedRoleFilter === "admin"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <span>👑</span>
            <span>Administrators ({adminCount})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search accounts..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-4 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-2xs"
          />
          <div className="pointer-events-none absolute left-3 top-2.5 text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Users List Grid */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 rounded-3xl bg-slate-100 animate-pulse border border-slate-200/60" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 rounded-3xl border border-dashed border-slate-200 bg-white">
            No accounts found matching your filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u) => {
              const isStaff = u.role === "staff";
              const isMaster = u.username === "admin" || u.username === "itsemranraj" || u.username === "fixionfuel_admin";
              return (
                <div
                  key={u.id}
                  className="group rounded-3xl border border-slate-200/80 bg-white p-5 hover:border-slate-300 hover:shadow-md transition-all shadow-2xs flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm uppercase shadow-xs shrink-0 ${
                        isStaff ? "bg-amber-100 text-amber-900 border border-amber-200" : "bg-[#18181B] text-white"
                      }`}
                    >
                      {u.username.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-slate-900 truncate">
                          {u.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isStaff
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-slate-900 text-white"
                          }`}
                        >
                          {isStaff ? "💼 Sales Rep" : "👑 Admin"}
                        </span>
                      </div>

                      <p className="text-xs font-mono font-bold text-slate-600 mt-1">
                        @{u.username}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {u.email}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setResetTargetUser(u)}
                        className="px-3 py-1 text-xs font-bold rounded-xl bg-slate-100 hover:bg-[#18181B] hover:text-white text-slate-700 transition-all shadow-2xs"
                      >
                        Password
                      </button>

                      {isStaff && (
                        <Link
                          href={`/orders?search=${encodeURIComponent(u.username)}`}
                          className="px-3 py-1 text-xs font-bold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-all shadow-2xs inline-flex items-center gap-1"
                        >
                          <span>Orders</span>
                          <span>→</span>
                        </Link>
                      )}
                    </div>

                    {!isMaster && (
                      <button
                        onClick={() => setDeleteTargetUser(u)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Delete User Account"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ADD NEW MEMBER MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">
                Add New Team Member
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe (Sales Rep)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. johndoe"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. john@fixionfuel.shop"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Initial Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Create a strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Account Role Permission
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewRole("staff")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      newRole === "staff"
                        ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400/20"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-base">💼</div>
                    <div className="text-xs font-black text-slate-900 mt-1">Sales Rep</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Orders & Catalog only</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRole("admin")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      newRole === "admin"
                        ? "bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900/20"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-base">👑</div>
                    <div className={`text-xs font-black mt-1 ${newRole === "admin" ? "text-white" : "text-slate-900"}`}>
                      Admin
                    </div>
                    <div className={`text-[10px] mt-0.5 ${newRole === "admin" ? "text-slate-300" : "text-slate-500"}`}>
                      Full store control
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#18181B] hover:bg-black text-white text-xs font-black rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESET PASSWORD MODAL */}
      {/* ========================================================================= */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Change Password
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Updating password for user{" "}
                <strong className="text-slate-900 font-mono">@{resetTargetUser.username}</strong>
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
              <input
                type="password"
                required
                placeholder="Enter new password"
                value={resetPasswordInput}
                onChange={(e) => setResetPasswordInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetTargetUser(null);
                    setResetPasswordInput("");
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-4 py-2 bg-[#18181B] hover:bg-black text-white text-xs font-black rounded-xl shadow-md disabled:opacity-50"
                >
                  {isResetting ? "Saving..." : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl mx-auto">
              ⚠️
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                Delete User Account?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete{" "}
                <strong className="text-slate-900 font-bold">"{deleteTargetUser.name}" (@{deleteTargetUser.username})</strong>? They will no longer be able to log in.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeamManagementPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400 font-bold">Loading team management...</div>}>
      <TeamManagementContent />
    </Suspense>
  );
}
