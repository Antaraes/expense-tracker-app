import { createClient } from "@/lib/supabase/client";

export type CreateAppVersionInput = {
  version: string;
  platform: "desktop" | "android" | "ios";
  releaseNotes: string;
  downloadUrl: string;
  assetUrlWin: string;
  assetUrlMac: string;
  assetUrlLinux: string;
  isCritical: boolean;
  isPublished: boolean;
  rolloutPercentage: number;
  minOsVersion: string;
};

export const adminVersionsService = {
  async getDesktopDistribution() {
    const supabase = createClient();
    return supabase.rpc("get_desktop_version_distribution");
  },

  async listAll() {
    const supabase = createClient();
    return supabase
      .from("app_versions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
  },

  async create(input: CreateAppVersionInput) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not signed in") };

    const now = new Date().toISOString();
    const published_at = input.isPublished ? now : null;

    return supabase
      .from("app_versions")
      .insert({
        version: input.version.trim(),
        platform: input.platform,
        release_notes: input.releaseNotes.trim() || null,
        download_url: input.downloadUrl.trim() || null,
        asset_url_win: input.assetUrlWin.trim() || null,
        asset_url_mac: input.assetUrlMac.trim() || null,
        asset_url_linux: input.assetUrlLinux.trim() || null,
        is_critical: input.isCritical,
        is_published: input.isPublished,
        rollout_percentage: input.rolloutPercentage,
        min_os_version: input.minOsVersion.trim() || null,
        published_at,
        created_by: user.id,
      })
      .select()
      .maybeSingle();
  },

  async delete(id: string) {
    const supabase = createClient();
    return supabase.from("app_versions").delete().eq("id", id);
  },
};
