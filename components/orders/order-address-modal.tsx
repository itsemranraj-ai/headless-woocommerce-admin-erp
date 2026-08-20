"use client";

import React, { useState } from "react";
import { Address } from "@/types";
import { getLocationData } from "@/lib/data/locations";

export interface OrderAddressModalProps {
  orderId: number;
  type: "billing" | "shipping";
  initialAddress: Address;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedAddress: Address) => void;
}

export function OrderAddressModal({
  orderId,
  type,
  initialAddress,
  isOpen,
  onClose,
  onSuccess,
}: OrderAddressModalProps) {
  const [form, setForm] = useState<Address>({
    first_name: initialAddress?.first_name || "",
    last_name: initialAddress?.last_name || "",
    company: initialAddress?.company || "",
    address_1: initialAddress?.address_1 || "",
    address_2: initialAddress?.address_2 || "",
    city: initialAddress?.city || "",
    state: initialAddress?.state || "",
    postcode: initialAddress?.postcode || "",
    country: initialAddress?.country || "BD",
    email: initialAddress?.email || "",
    phone: initialAddress?.phone || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "country") {
      setForm((prev) => ({
        ...prev,
        country: value,
        city: "",
        state: "",
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = type === "billing" ? { billing: form } : { shipping: form };
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update address.");
      }

      onSuccess(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update address.");
    } finally {
      setLoading(false);
    }
  };

  const locationData = getLocationData(form.country || "BD");
  const title = type === "billing" ? "Edit Billing Address" : "Edit Shipping Address";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="text-lg font-extrabold text-[#18181b]">{title}</h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Company (Optional)
            </label>
            <input
              type="text"
              name="company"
              value={form.company || ""}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Street Address
            </label>
            <input
              type="text"
              name="address_1"
              value={form.address_1}
              onChange={handleChange}
              placeholder="House #, Street name"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Apartment / Suite / Unit (Optional)
            </label>
            <input
              type="text"
              name="address_2"
              value={form.address_2 || ""}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                City / Town
              </label>
              <input
                type="text"
                name="city"
                list="modal-cities-list"
                value={form.city}
                onChange={handleChange}
                placeholder={`e.g. ${locationData.cities[0] || "City"}`}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
              />
              <datalist id="modal-cities-list">
                {locationData.cities.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                District / State
              </label>
              {locationData.states.length > 0 ? (
                <select
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 cursor-pointer"
                >
                  <option value="">Select District / State</option>
                  {locationData.states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="District / State"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Postcode / ZIP
              </label>
              <input
                type="text"
                name="postcode"
                value={form.postcode}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Country
              </label>
              <select
                name="country"
                value={form.country}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 cursor-pointer"
              >
                <option value="BD">Bangladesh (BD)</option>
                <option value="US">United States (US)</option>
                <option value="GB">United Kingdom (UK)</option>
                <option value="CA">Canada (CA)</option>
                <option value="AU">Australia (AU)</option>
                <option value="AE">United Arab Emirates (UAE)</option>
                <option value="SA">Saudi Arabia (SA)</option>
                <option value="IN">India (IN)</option>
                <option value="MY">Malaysia (MY)</option>
                <option value="SG">Singapore (SG)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone || ""}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={form.email || ""}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-extrabold rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all disabled:opacity-50 shadow-sm active:scale-95"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Save Address
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
