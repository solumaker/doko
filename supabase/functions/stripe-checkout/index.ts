import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import Stripe from "npm:stripe@14.14.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LEGACY_PLAN_PRICES: Record<string, { price_id: string; doc_limit: number; user_limit: number }> = {
  autonomo: { price_id: "price_1T9509BnbfHLJ2lEcwu2GuZu", doc_limit: 100, user_limit: 1 },
  pyme: { price_id: "price_1T7HFABnbfHLJ2lE8Q916Xrm", doc_limit: 500, user_limit: 3 },
  flotas: { price_id: "price_1T950eBnbfHLJ2lEAZOFRDIf", doc_limit: 2500, user_limit: 10 },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can manage billing" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id, name, stripe_customer_id")
      .eq("id", profile.company_id)
      .maybeSingle();

    if (!company) {
      return new Response(
        JSON.stringify({ error: "Company not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let customerId = company.stripe_customer_id;

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        customerId = null;
        await supabaseAdmin
          .from("companies")
          .update({ stripe_customer_id: null })
          .eq("id", company.id);
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: company.name,
        metadata: { company_id: company.id },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from("companies")
        .update({ stripe_customer_id: customerId })
        .eq("id", company.id);
    }

    const body = await req.json();
    const { mode, plan, pack, quantity: rawQty, success_url, cancel_url, billing_cycle, document_tier } = body;

    if (mode === "payment" && pack) {
      const qty = Math.max(1, Math.min(50, Math.floor(Number(rawQty) || 1)));

      const { data: subRow } = await supabaseAdmin
        .from("subscriptions")
        .select("plan")
        .eq("company_id", company.id)
        .maybeSingle();

      const normalizedPlan = (() => {
        const p = subRow?.plan;
        if (p === "basico" || p === "autonomo") return "basico";
        if (p === "pro" || p === "pyme" || p === "flotas") return "pro";
        return null;
      })();

      let extraPriceId = "price_1T9W1WBnbfHLJ2lEUzp4s90N";
      if (normalizedPlan) {
        const { data: cfg } = await supabaseAdmin
          .from("extra_pack_config")
          .select("stripe_price_id")
          .eq("plan", normalizedPlan)
          .maybeSingle();
        if (cfg?.stripe_price_id && !cfg.stripe_price_id.startsWith("price_PLACEHOLDER")) {
          extraPriceId = cfg.stripe_price_id;
        }
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        automatic_tax: { enabled: true },
        customer_update: { address: "auto" },
        billing_address_collection: "required",
        line_items: [
          {
            price: extraPriceId,
            quantity: qty,
            adjustable_quantity: { enabled: true, minimum: 1 },
          },
        ],
        metadata: {
          company_id: company.id,
          type: "document_pack",
          quantity: String(qty),
          plan: normalizedPlan ?? "",
        },
        success_url: success_url || `${req.headers.get("origin")}?checkout_success=true&type=pack`,
        cancel_url: cancel_url || `${req.headers.get("origin")}?checkout_cancel=true`,
      });

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "subscription" && (plan === "basico" || plan === "pro") && document_tier) {
      const cycle = billing_cycle === "yearly" ? "yearly" : "monthly";
      const tier = Math.floor(Number(document_tier));

      const { data: tierRow, error: tierErr } = await supabaseAdmin
        .from("plan_tiers")
        .select("*")
        .eq("plan", plan)
        .eq("documents", tier)
        .maybeSingle();

      if (tierErr || !tierRow) {
        return new Response(
          JSON.stringify({ error: "Tier not found", plan, tier }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const available = cycle === "monthly" ? tierRow.available_monthly : tierRow.available_yearly;
      const priceId = cycle === "monthly" ? tierRow.stripe_price_id_monthly : tierRow.stripe_price_id_yearly;

      if (!available || !priceId) {
        return new Response(
          JSON.stringify({ error: "Tier not available", plan, tier, billing_cycle: cycle, force_plan: "pro" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        automatic_tax: { enabled: true },
        customer_update: { address: "auto" },
        billing_address_collection: "required",
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          metadata: {
            company_id: company.id,
            plan,
            billing_cycle: cycle,
            document_tier: String(tier),
            document_limit: String(tier),
          },
        },
        metadata: {
          company_id: company.id,
          plan,
          billing_cycle: cycle,
          document_tier: String(tier),
        },
        success_url: success_url || `${req.headers.get("origin")}?checkout_success=true`,
        cancel_url: cancel_url || `${req.headers.get("origin")}?checkout_cancel=true`,
      });

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "subscription" && plan && LEGACY_PLAN_PRICES[plan]) {
      const planConfig = LEGACY_PLAN_PRICES[plan];

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        automatic_tax: { enabled: true },
        customer_update: { address: "auto" },
        billing_address_collection: "required",
        line_items: [{ price: planConfig.price_id, quantity: 1 }],
        subscription_data: {
          metadata: {
            company_id: company.id,
            plan,
            document_limit: String(planConfig.doc_limit),
            user_limit: String(planConfig.user_limit),
          },
        },
        metadata: {
          company_id: company.id,
          plan,
        },
        success_url: success_url || `${req.headers.get("origin")}?checkout_success=true`,
        cancel_url: cancel_url || `${req.headers.get("origin")}?checkout_cancel=true`,
      });

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid request parameters" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("stripe-checkout error:", message);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
