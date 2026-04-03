import { createClient } from "@/lib/supabase/client";

export type CategoryType = "expense" | "income" | "both";

export const categoryService = {
  async list() {
    const supabase = createClient();
    return supabase.from("categories").select("*").order("sort_order");
  },

  async create(input: {
    name: string;
    type: CategoryType;
    color?: string | null;
    icon?: string | null;
    sort_order?: number;
    parent_id?: string | null;
  }) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not signed in") };
    return supabase
      .from("categories")
      .insert({
        user_id: user.id,
        parent_id: input.parent_id ?? null,
        name: input.name.trim(),
        type: input.type,
        color: input.color ?? null,
        icon: input.icon ?? null,
        is_system: false,
        sort_order: input.sort_order ?? 100,
      })
      .select()
      .maybeSingle();
  },

  async update(
    id: string,
    input: Partial<{
      name: string;
      type: CategoryType;
      color: string | null;
      icon: string | null;
      sort_order: number;
    }>
  ) {
    const supabase = createClient();
    return supabase.from("categories").update(input).eq("id", id).select().maybeSingle();
  },

  async remove(id: string) {
    const supabase = createClient();
    return supabase.from("categories").delete().eq("id", id);
  },
};
