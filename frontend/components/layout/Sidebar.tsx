// components/layout/Sidebar.tsx
// This file will be used to handle the sidebar of the application

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { useSession } from "next-auth/react";
import { logoutAction } from "@/lib/actions/auth";
import { motion, AnimatePresence } from "framer-motion";

export function Sidebar() {
  const { isSidebarCollapsed, toggleSidebar } = useStore();
  const pathname = usePathname();
  const { data: session } = useSession();

  const isAdmin = session?.user?.role === 'ADMIN';
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navItems = [
    { name: "Dashboard", href: "/", icon: "dashboard" },
    { name: "Metrics", href: "/metrics", icon: "analytics" },
    { name: "Chatbot", href: "/chatbot", icon: "smart_toy" },
    { name: "Maintenance", href: "/maintenance", icon: "engineering" },
  ];

  // Admin gets an amber/gold accent, regular users get the default theme
  const adminBorderClass = isAdmin ? 'border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.08)]' : 'border-outline-variant';
  const adminLogoBg = isAdmin
    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-[0_0_18px_rgba(245,158,11,0.4)]'
    : 'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_0_15px_rgba(78,222,163,0.3)]';
  const adminTitleColor = isAdmin ? 'text-amber-400' : 'text-primary';
  const adminActiveNavBg = isAdmin
    ? 'bg-amber-500/10 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.1)] border border-amber-500/20'
    : 'bg-primary/10 text-primary shadow-[0_0_20px_rgba(78,222,163,0.1)] border border-primary/20';

  return (
    <>
      <nav className={`bg-surface-container-lowest/80 backdrop-blur-xl fixed left-0 top-0 h-full ${isSidebarCollapsed ? 'w-[64px]' : 'w-[280px]'} max-md:hidden border-r ${adminBorderClass} shadow-lg flex flex-col py-6 px-4 z-50 transition-all duration-300 ease-in-out`}>

        {/* Admin top accent bar */}
        {isAdmin && !isSidebarCollapsed && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/0 via-amber-400 to-amber-500/0" />
        )}
        {isAdmin && isSidebarCollapsed && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/0 via-amber-400 to-amber-500/0" />
        )}

        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} mb-8`}>
          <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'hidden' : 'px-2'} transition-opacity duration-300`}>
            <div className={`w-8 h-8 rounded-lg ${adminLogoBg} flex items-center justify-center font-bold`}>B</div>
            <div>
              <h1 className={`font-headline-md text-[24px] font-bold ${adminTitleColor} leading-none tracking-tight`}>BioArc</h1>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-1">IoT Control</p>
            </div>
          </div>

          <button
            onClick={toggleSidebar}
            className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container/50 rounded-lg transition-colors border border-transparent hover:border-outline-variant"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isSidebarCollapsed ? 'menu' : 'menu_open'}
            </span>
          </button>
        </div>

        {!isSidebarCollapsed && (
          <div className="text-[10px] font-bold text-on-surface-variant mb-4 px-2 tracking-widest uppercase transition-opacity duration-300">
            General
          </div>
        )}

        <ul className="space-y-2 flex-grow">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-300 ${isActive
                    ? adminActiveNavBg
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low border border-transparent'
                    }`}
                  title={item.name}
                >
                  <span className={`material-symbols-outlined ${isActive ? 'fill' : ''}`}>{item.icon}</span>
                  {!isSidebarCollapsed && <span className="font-label-md text-[14px] font-medium">{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        <ul className="space-y-1 mt-auto border-t border-outline-variant/50 pt-4">
          <li>
            <Link href={isAdmin ? "/telegram" : "#"} className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-4'} py-2 rounded-xl ${pathname === '/telegram' ? (isAdmin ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'bg-primary/10 text-primary') : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'} transition-all duration-200 border border-transparent`} title={isAdmin ? "Telegram Bot & Users" : "Help Center"}>
              <span className="material-symbols-outlined text-[18px]">help_outline</span>
              {!isSidebarCollapsed && <span className="font-label-md text-[13px] font-medium">{isAdmin ? "Telegram Bot" : "Help Center"}</span>}
            </Link>
          </li>
          {session && (
            <li>
              <Link href="/security" className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-4'} py-2 rounded-xl text-on-surface-variant hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors duration-200 border border-transparent`} title="Security">
                <span className="material-symbols-outlined text-[18px]">security</span>
                {!isSidebarCollapsed && <span className="font-label-md text-[13px]">Security</span>}
              </Link>
            </li>
          )}
          <li>
            {session ? (
              isAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-4'} py-2 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200 border border-red-500/0 hover:border-red-500/20 cursor-pointer`}
                  title="Logout"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  {!isSidebarCollapsed && <span className="font-label-md text-[13px] font-medium">Logout</span>}
                </button>
              ) : (
                <form action={logoutAction}>
                  <button type="submit" className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-4'} py-2 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200 border border-red-500/0 hover:border-red-500/20 cursor-pointer`} title="Logout">
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    {!isSidebarCollapsed && <span className="font-label-md text-[13px] font-medium">Logout</span>}
                  </button>
                </form>
              )
            ) : (
              <Link href="/login" className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-4'} py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all duration-200 border border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]`} title="Login">
                <span className="material-symbols-outlined text-[18px]">login</span>
                {!isSidebarCollapsed && <span className="font-label-md text-[13px] font-semibold"> Authorize </span>}
              </Link>
            )}
          </li>
        </ul>

        {/* Footer: Role Badge + Version */}
        <div className={`mt-6 ${isSidebarCollapsed ? 'px-0' : 'block'} transition-opacity duration-300`}>
          {/* Admin badge — always visible even when collapsed */}
          {isAdmin && (
            <div className={`flex items-center justify-center gap-1.5 mb-2 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 ${isSidebarCollapsed ? 'mx-0' : ''}`}>
              <span className="material-symbols-outlined text-[14px] text-amber-400 fill">shield_person</span>
              {!isSidebarCollapsed && <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Admin</span>}
            </div>
          )}
          {session && !isAdmin && (
            <div className={`flex items-center justify-center gap-1.5 mb-2 px-2 py-1.5 rounded-lg bg-zinc-500/10 border border-zinc-500/20 ${isSidebarCollapsed ? 'mx-0' : ''}`}>
              <span className="material-symbols-outlined text-[14px] text-zinc-400">person</span>
              {!isSidebarCollapsed && <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">User</span>}
            </div>
          )}
          {!isSidebarCollapsed && (
            <div className="bg-surface-container-low rounded-xl p-3 border border-outline-variant/30">
              <p className="text-[10px] text-on-surface-variant text-center leading-tight uppercase font-medium">
                BioArc v1.0.0<br />
                System Normal
              </p>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile-only flag navigation */}
      <nav className="md:hidden fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-surface-container-lowest/90 backdrop-blur-xl border-l border-y border-outline-variant rounded-l-xl p-1.5 flex flex-col gap-2 shadow-[-5px_0_20px_rgba(0,0,0,0.5)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-300 ${isActive
                ? 'bg-primary/20 text-primary shadow-[0_0_20px_rgba(78,222,163,0.2)]'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                }`}
              title={item.name}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
            </Link>
          );
        })}
      </nav>

      {/* Admin Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLogoutModal(false)}
          >
            <motion.div
              className="bg-[#1a1a1d] border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-red-400 text-[24px]">shield_person</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Admin Logout</h3>
                <p className="text-sm text-zinc-400 mb-6">
                  You are signed in as <span className="text-amber-400 font-semibold">Admin</span>. Are you sure you want to log out?
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition-all text-sm font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <form action={logoutAction} className="flex-1">
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all text-sm font-semibold cursor-pointer"
                    >
                      Logout
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
