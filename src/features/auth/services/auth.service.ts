import { createClient } from "@/lib/supabase/client";

export const authService = {
  async signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  },
};
