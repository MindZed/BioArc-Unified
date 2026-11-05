// components/dashboard/AdminPasswordModal.tsx
// Secure Administrator Verification Modal for Dev Mode & Actuator Access

"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useSession } from "next-auth/react";
import { verifyAdminPasswordAction } from "@/lib/actions/auth";
import { ShieldAlert, X, KeyRound, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export function AdminPasswordModal() {
  const { isAdminAuthModalOpen, closeAdminAuthModal, adminAuthSuccessCallback } = useStore();
  const { update } = useSession();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdminAuthModalOpen) {
      setPassword("");
      setError("");
      setIsPending(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isAdminAuthModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isPending) return;

    setIsPending(true);
    setError("");

    try {
      const result = await verifyAdminPasswordAction(password);

      if (result?.error) {
        setError(result.error);
        setIsPending(false);
      } else {
        // Successfully authenticated as Admin
        if (adminAuthSuccessCallback) {
          try {
            await adminAuthSuccessCallback();
          } catch (cbErr) {
            console.error("Error executing admin callback:", cbErr);
          }
        }

        if (update) {
          await update();
        }

        closeAdminAuthModal();
        setIsPending(false);

        // Ensure full session sync across all client/server components
        window.location.reload();
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      setError("An unexpected authentication error occurred.");
      setIsPending(false);
    }
  };

  return (
    <AnimatePresence>
      {isAdminAuthModalOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!isPending) closeAdminAuthModal();
          }}
        >
          <motion.div
            className="bg-[#121215] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden"
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                if (!isPending) closeAdminAuthModal();
              }}
              className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3.5 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="font-clash text-xl font-bold text-white tracking-wide">
                Admin Authorization Required
              </h3>
              <p className="text-zinc-400 font-satoshi text-xs mt-1.5 max-w-xs leading-relaxed">
                Enter your administrator password to unlock Bench Dev Mode and physical actuator controls.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-satoshi text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
                  Administrator Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    ref={inputRef}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Enter admin password..."
                    disabled={isPending}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => closeAdminAuthModal()}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white transition-all text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !password.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black transition-all text-xs font-bold font-clash uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.25)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Authorize & Unlock</span>
                  )}
                </button>
              </div>
            </form>

            {/* Bottom link to standard login page */}
            <div className="mt-5 pt-4 border-t border-white/5 text-center">
              <Link
                href="/login"
                onClick={() => closeAdminAuthModal()}
                className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-amber-400 transition-colors font-satoshi"
              >
                <span>Or sign in with full Administrator credentials</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
