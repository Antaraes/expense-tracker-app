import { createClient } from "@/lib/supabase/client";

export type CategoryType = "expense" | "income" | "both";

export const categoryService = {
  async create(input: {
    name: string;
    type: CategoryType;
    color: string | null;
    parent_id: string | null;
  }): Promise<{ error: Error | null }> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.from("categories").insert({
      user_id: user.id,
      name: input.name,
      type: input.type,
      color: input.color,
      parent_id: input.parent_id,
      is_system: false,
      sort_order: 0,
    });

    if (error) return { error: new Error(error.message) };
    return { error: null };
  },

  async update(
    id: string,
    patch: { name: string; color: string | null }
  ): Promise<{ error: Error | null }> {
    const supabase = createClient();
    const { error } = await supabase
      .from("categories")
      .update({ name: patch.name, color: patch.color })
      .eq("id", id);

    if (error) return { error: new Error(error.message) };
    return { error: null };
  },

  async remove(id: string): Promise<{ error: Error | null }> {
    const supabase = createClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return { error: new Error(error.message) };
    return { error: null };
  },
};
