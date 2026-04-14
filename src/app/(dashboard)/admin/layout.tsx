import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/admin/notifications");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "superadmin") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">{children}</div>
  );
}
