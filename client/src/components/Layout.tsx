import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Inbox, GitMerge, ScrollText, Radio } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useStore } from "../hooks/StoreContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/tickets", label: "Tickets", icon: Inbox },
  { to: "/incidents", label: "Incidents", icon: GitMerge },
  { to: "/ledger", label: "Ledger", icon: ScrollText },
];

export function Layout() {
  const { connected } = useStore();

  return (
    <div className="min-h-screen bg-paper flex">
      <aside className="w-64 shrink-0 border-r-2 border-ink bg-panel flex flex-col">
        <div className="px-5 pt-6 pb-4">
          <BrandMark compact />
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted mt-1.5">Reasoning Continuity Engine</p>
        </div>
        <div className="section-rule mx-5 opacity-20" />

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 text-xs font-mono uppercase tracking-wide font-medium transition-colors border ${
                  isActive
                    ? "bg-ink text-paper border-ink"
                    : "text-ink/70 border-transparent hover:border-ink/30 hover:bg-paper"
                }`
              }
            >
              <Icon size={15} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t-2 border-ink">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted">
            <Radio size={12} className={connected ? "text-success" : "text-danger"} />
            {connected ? "LIVE" : "RECONNECTING…"}
          </div>
          <p className="mt-2 text-[10px] leading-snug text-muted font-mono">
            {"// don't just pass the ticket."}
            <br />
            {"// pass the reasoning."}
          </p>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}