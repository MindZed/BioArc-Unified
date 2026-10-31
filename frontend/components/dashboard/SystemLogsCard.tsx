// components/dashboard/SystemLogsCard.tsx
// Real-time Diagnostic Events Stream Bento Card

"use client";

import React from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Terminal, ExternalLink } from "lucide-react";

export function SystemLogsCard() {
  const { maintenanceLogs } = useStore();

  return (
    <div className="col-span-2 md:col-span-3 lg:col-span-2 bg-surface-container-lowest border border-outline-variant flex flex-col motion-card min-h-[280px] font-clash shadow-md p-4 rounded-2xl opacity-0 hover:border-outline/50 transition-colors duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-surface-container text-on-surface-variant">
            <Terminal className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-satoshi text-[13px] font-semibold text-on-surface-variant uppercase tracking-wider">
            Diagnostic Stream
          </h3>
        </div>
        <Link
          href="/maintenance"
          className="flex items-center gap-1 border border-outline-variant/60 px-2 py-0.5 rounded-full text-[10px] font-semibold text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors"
        >
          <span>Audit Log</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </Link>
      </div>

      {/* Log Entries */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1.5">
        {maintenanceLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-on-surface-variant text-[11px] font-mono py-6">
            <span className="w-2 h-2 rounded-full bg-primary/40 mb-2" />
            System nominal — awaiting hardware log events...
          </div>
        ) : (
          maintenanceLogs.slice(0, 5).map((log) => {
            const isNominal = log.severity === 'nominal' || !log.severity;
            const isWarning = log.severity === 'warning';
            const isCritical = log.severity === 'critical';

            const dotColor = isCritical ? 'bg-error animate-ping' : isWarning ? 'bg-amber-400' : 'bg-primary';
            const badgeBg = isCritical ? 'bg-error/20 text-error' : isWarning ? 'bg-amber-500/20 text-amber-400' : 'bg-primary/10 text-primary';

            return (
              <div
                key={log.id}
                className="flex items-start gap-2.5 rounded-xl hover:bg-surface-container/60 transition-all p-2 border border-transparent hover:border-outline-variant/30"
              >
                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-medium text-[12px] text-on-surface truncate font-sans">
                      {log.message}
                    </span>
                    <span className="text-[9px] font-mono text-on-surface-variant shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase tracking-wider ${badgeBg}`}>
                    {log.severity || 'nominal'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
