import { createContext, useContext, ReactNode } from "react";
import { LiveStore, useLiveStore } from "./useLiveStore";

const Ctx = createContext<LiveStore | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useLiveStore();
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): LiveStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
