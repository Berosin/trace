import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Inbox, GitMerge, ScrollText, Radio } from "lucide-react";
import { DutchDoor } from "./DutchDoor";
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
    <div className="min-h-screen bg-porcelain flex">
      <aside className="w-64 shrink-0 border-r border-door-light bg-linen/70 flex flex-col">
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-2.5">
            <DutchDoor compact className="h-9 w-9" />
            <div>
              <p className="font-display text-lg leading-none text-delft">TRACE</p>
              <p className="text-[11px] tracking-wide text-ink/50 mt-0.5">Reasoning Continuity Engine</p>
            </div>
          </div>
        </div>
        <div className="floral-rule mx-5" />

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-door/35 text-delft" : "text-ink/65 hover:bg-door-light/40 hover:text-delft"
                }`
              }
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-door-light">
          <div className="flex items-center gap-2 text-xs text-ink/55">
            <Radio size={13} className={connected ? "text-leaf" : "text-rust"} />
            {connected ? "Live" : "Reconnecting…"}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-ink/45 italic font-display">
            "Don't just pass the ticket. Pass the reasoning."
          </p>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
