import { createClient } from "@/lib/supabase/client";

/** Reporting queries — extend with views / RPCs from docs. */
export const reportsService = {
  async accountBalances() {
    const supabase = createClient();
    return supabase.from("account_balances").select("*");
  },
};
