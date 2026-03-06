"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ChevronDown } from "lucide-react";
import { signOut as nextAuthSignOut, useSession } from "next-auth/react";

export function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function signOut() {
    await nextAuthSignOut({ callbackUrl: "/" });
  }

  const user = session?.user;
  if (!user) return null;

  const displayName = user.name || user.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-sm text-white/70 transition-colors hover:border-white/20 hover:text-white"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F04D26]/20 text-[10px] font-bold text-[#F04D26]">
          {initials}
        </span>
        <span className="hidden max-w-[100px] truncate sm:block">{displayName}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a1a1a] shadow-2xl"
          >
            <div className="rounded-[14px] border border-white/[0.04] bg-[#111111] p-1.5">
              <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                <p className="text-xs font-semibold text-white/70 truncate">{displayName}</p>
                <p className="text-xs text-white/30 truncate">{user.email}</p>
              </div>
              <button
                onClick={signOut}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-red-400/80 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
