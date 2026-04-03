import { createClient } from "@/lib/supabase/client";

export const currencyService = {
  async list() {
    const supabase = createClient();
    return supabase.from("currencies").select("*").eq("is_active", true);
  },
};
