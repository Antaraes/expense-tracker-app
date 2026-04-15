import { createClient } from "@/lib/supabase/client";
import { getDesktopInstallId } from "@/lib/install-id";

export const pushTokensService = {
  async reportDesktopVersion(userId: string, appVersion: string): Promise<void> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== userId) return;

    const token = `desktop-${getDesktopInstallId()}`;
    await supabase.from("push_tokens").upsert(
      {
        user_id: user.id,
        token,
        platform: "desktop",
        app_version: appVersion,
        is_active: true,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "user_id,token" }
    );
  },
};
