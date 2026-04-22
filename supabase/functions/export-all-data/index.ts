import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PAGE_SIZE = 1000;

async function fetchAll<T>(
  client: ReturnType<typeof createClient>,
  table: string,
  columns: string,
): Promise<T[]> {
  const results: T[] = [];
  let from = 0;
  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await client
      .from(table)
      .select(columns)
      .range(from, to);
    if (error) throw new Error(`Error fetching ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    results.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return results;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const expectedKey = Deno.env.get("EXPORT_API_KEY");
    if (!expectedKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Server misconfigured: EXPORT_API_KEY secret not set",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const url = new URL(req.url);
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    const queryKey = url.searchParams.get("key") ?? "";
    const providedKey = bearer || queryKey;

    if (!providedKey || providedKey !== expectedKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Server misconfigured: Supabase env vars missing",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [companies, profiles, documents] = await Promise.all([
      fetchAll<Record<string, unknown>>(
        admin,
        "companies",
        "id, name, cif, created_at, stripe_customer_id, trial_ends_at",
      ),
      fetchAll<Record<string, unknown>>(
        admin,
        "profiles",
        "id, company_id, role, full_name, created_at",
      ),
      fetchAll<Record<string, unknown>>(
        admin,
        "documents",
        "id, company_id, creator_id, created_at, pdf_url, driver_name",
      ),
    ]);

    const usersByCompany = new Map<string, Record<string, unknown>[]>();
    for (const p of profiles) {
      const cid = p["company_id"] as string | null;
      if (!cid) continue;
      if (!usersByCompany.has(cid)) usersByCompany.set(cid, []);
      usersByCompany.get(cid)!.push(p);
    }

    const docsByCompany = new Map<string, Record<string, unknown>[]>();
    for (const d of documents) {
      const cid = d["company_id"] as string | null;
      if (!cid) continue;
      if (!docsByCompany.has(cid)) docsByCompany.set(cid, []);
      docsByCompany.get(cid)!.push(d);
    }

    const companiesPayload = companies.map((c) => {
      const cid = c["id"] as string;
      return {
        ...c,
        users: usersByCompany.get(cid) ?? [],
        documents: docsByCompany.get(cid) ?? [],
      };
    });

    const payload = {
      ok: true,
      generated_at: new Date().toISOString(),
      total_companies: companies.length,
      total_users: profiles.length,
      total_documents: documents.length,
      companies: companiesPayload,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
