import { createClient } from "@/lib/supabase/client";

export const authService = {
  signInWithPassword(email: string, password: string) {
    const supabase = createClient();
    return supabase.auth.signInWithPassword({ email, password });
  },

  signUp(email: string, password: string) {
    const supabase = createClient();
    return supabase.auth.signUp({ email, password });
  },

  signOut() {
    const supabase = createClient();
    return supabase.auth.signOut();
  },
};
