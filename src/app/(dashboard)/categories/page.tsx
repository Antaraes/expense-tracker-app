import { redirect } from "next/navigation";
import { CategoriesManager } from "@/features/categories/components/categories-manager";
import { createClient } from "@/lib/supabase/server";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">
          System defaults plus categories you create for your account.
        </p>
      </div>
      <CategoriesManager categories={categories ?? []} userId={user.id} />
    </div>
  );
}
