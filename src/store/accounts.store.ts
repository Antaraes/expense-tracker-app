import { create } from "zustand";

/** Cached account list — hydrate from accountService in layouts/pages. */
export const useAccountsStore = create<{
  lastFetched: number | null;
  setLastFetched: (t: number) => void;
}>((set) => ({
  lastFetched: null,
  setLastFetched: (lastFetched) => set({ lastFetched }),
}));
