import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-id",
};

function compareSemver(a: string, b: string): number {
  const pa = a.split(/[.+]/).map((x) => Number.parseInt(x, 10) || 0);
  const pb = b.split(/[.+]/).map((x) => Number.parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

function hashBucket(clientId: string): number {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = (hash << 5) - hash + clientId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

type Row = {
  version: string;
  release_notes: string | null;
  download_url: string | null;
  asset_url_win: string | null;
  asset_url_mac: string | null;
  asset_url_linux: string | null;
  is_critical: boolean;
  rollout_percentage: number;
  published_at: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const current_version =
      typeof body.current_version === "string" ? body.current_version : "";
    const platform =
      typeof body.platform === "string" ? body.platform : "darwin";

    if (!current_version) {
      return new Response(
        JSON.stringify({ update_available: false, error: "current_version required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(url, key);

    const { data: rows, error } = await supabase
      .from("app_versions")
      .select("*")
      .eq("platform", "desktop")
      .eq("is_published", true);

    if (error || !rows?.length) {
      return new Response(JSON.stringify({ update_available: false }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let latest = rows[0] as Row;
    for (const r of rows as Row[]) {
      if (compareSemver(r.version, latest.version) > 0) latest = r;
    }

    if (compareSemver(latest.version, current_version) <= 0) {
      return new Response(JSON.stringify({ update_available: false }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const clientId = req.headers.get("x-client-id") ?? "anonymous";
    const bucket = hashBucket(clientId);
    if (latest.rollout_percentage < 100 && bucket >= latest.rollout_percentage) {
      return new Response(JSON.stringify({ update_available: false }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let download_url = latest.download_url;
    if (platform === "win32") download_url = latest.asset_url_win || download_url;
    if (platform === "darwin") download_url = latest.asset_url_mac || download_url;
    if (platform === "linux") download_url = latest.asset_url_linux || download_url;

    return new Response(
      JSON.stringify({
        update_available: true,
        version: latest.version,
        release_notes: latest.release_notes,
        download_url,
        is_critical: latest.is_critical,
        published_at: latest.published_at,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ update_available: false, error: String(e) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
