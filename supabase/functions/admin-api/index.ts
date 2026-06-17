import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Admin-Token",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ADMIN_SECRET = Deno.env.get("ADMIN_JWT_SECRET") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function b64url(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const str = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64url(sig);
}

async function makeToken(adminId: string): Promise<string> {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({
        sub: adminId,
        role: "doko_admin",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
      }),
    ),
  );
  const sig = await hmac(ADMIN_SECRET, `${header}.${payload}`);
  return `${header}.${payload}.${sig}`;
}

async function verifyToken(token: string): Promise<{ sub: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = await hmac(ADMIN_SECRET, `${h}.${p}`);
  if (expected !== s) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(p))) as { sub: string; exp: number };
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = String(body.action ?? "");

  if (action === "login") {
    const email = String(body.email ?? "");
    const password = String(body.password ?? "");
    if (!email || !password) return json({ error: "Missing credentials" }, 400);
    const { data, error } = await admin.rpc("admin_verify_password", {
      p_email: email,
      p_password: password,
    });
    if (error) return json({ error: error.message }, 500);
    if (!data) return json({ error: "Credenciales invalidas" }, 401);
    await admin
      .from("admin_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", data);
    const token = await makeToken(data as string);
    return json({ token, admin_id: data });
  }

  const authHeader = req.headers.get("X-Admin-Token") ?? "";
  const verified = authHeader ? await verifyToken(authHeader) : null;
  if (!verified) return json({ error: "Unauthorized" }, 401);

  if (action === "list_companies") {
    const { data: companies, error } = await admin
      .from("companies")
      .select("id, name, cif, city, province, phone, created_at, free_doc_limit, free_plan_anchor, company_role")
      .order("created_at", { ascending: false });
    if (error) return json({ error: error.message }, 500);

    const { data: subs } = await admin
      .from("subscriptions")
      .select("company_id, plan, status, document_limit, current_period_end, cancel_at_period_end");
    const subMap = new Map<string, Record<string, unknown>>();
    for (const s of subs ?? []) subMap.set(s.company_id, s);

    const { data: profiles } = await admin
      .from("profiles")
      .select("company_id, full_name, email, role");
    const profileMap = new Map<string, Array<Record<string, unknown>>>();
    for (const p of profiles ?? []) {
      const arr = profileMap.get(p.company_id) ?? [];
      arr.push(p);
      profileMap.set(p.company_id, arr);
    }

    const enriched = (companies ?? []).map((c) => ({
      ...c,
      subscription: subMap.get(c.id) ?? null,
      members: profileMap.get(c.id) ?? [],
    }));

    return json({ companies: enriched });
  }

  if (action === "update_company") {
    const id = String(body.id ?? "");
    if (!id) return json({ error: "Missing id" }, 400);
    const patch: Record<string, unknown> = {};
    const allowed = ["name", "cif", "address", "city", "province", "postal_code", "phone", "free_doc_limit"];
    for (const k of allowed) {
      if (body[k] !== undefined) patch[k] = body[k];
    }
    if (Object.keys(patch).length === 0) return json({ error: "No fields" }, 400);
    const { error } = await admin.from("companies").update(patch).eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (action === "reset_free_window") {
    const id = String(body.id ?? "");
    if (!id) return json({ error: "Missing id" }, 400);
    const { error } = await admin
      .from("companies")
      .update({ free_plan_anchor: new Date().toISOString() })
      .eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (action === "update_profile") {
    const id = String(body.id ?? "");
    if (!id) return json({ error: "Missing id" }, 400);
    const patch: Record<string, unknown> = {};
    const allowed = ["full_name", "email", "dni", "role"];
    for (const k of allowed) {
      if (body[k] !== undefined) patch[k] = body[k];
    }
    if (Object.keys(patch).length === 0) return json({ error: "No fields" }, 400);
    const { error } = await admin.from("profiles").update(patch).eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
});
