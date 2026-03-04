import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import Stripe from "npm:stripe@14.14.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PLAN_PRICES: Record<string, { price_lookup: string; doc_limit: number; user_limit: number }> = {
  autonomo: { price_lookup: "autonomo_monthly", doc_limit: 100, user_limit: 1 },
  pyme: { price_lookup: "pyme_monthly", doc_limit: 500, user_limit: 3 },
  flotas: { price_lookup: "flotas_monthly", doc_limit: 2500, user_limit: 10 },
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
    const { mode, plan, pack, success_url, cancel_url } = body;

    if (mode === "payment" && pack) {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: { name: "+10 Documentos extra" },
              unit_amount: 50,
            },
            quantity: 1,
          },
        ],
        metadata: {
          company_id: company.id,
          type: "document_pack",
        },
        success_url: success_url || `${req.headers.get("origin")}?checkout_success=true&type=pack`,
        cancel_url: cancel_url || `${req.headers.get("origin")}?checkout_cancel=true`,
      });

      return new Response(
        JSON.stringify({ url: session.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "subscription" && plan && PLAN_PRICES[plan]) {
      const planConfig = PLAN_PRICES[plan];

      const prices = await stripe.prices.list({
        lookup_keys: [planConfig.price_lookup],
        active: true,
        limit: 1,
      });

      let priceId: string;
      if (prices.data.length > 0) {
        priceId = prices.data[0].id;
      } else {
        const product = await stripe.products.create({
          name: `DOKO ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
          metadata: { plan },
        });
        const price = await stripe.prices.create({
          product: product.id,
          currency: "eur",
          unit_amount: plan === "autonomo" ? 4000 : plan === "pyme" ? 9900 : 20000,
          recurring: { interval: "month" },
          lookup_key: planConfig.price_lookup,
        });
        priceId = price.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: 7,
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
    console.error("stripe-checkout error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
