import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import Stripe from "npm:stripe@14.14.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PLAN_LIMITS: Record<string, { document_limit: number; user_limit: number }> = {
  autonomo: { document_limit: 100, user_limit: 1 },
  pyme: { document_limit: 500, user_limit: 3 },
  flotas: { document_limit: 2500, user_limit: 10 },
};

const PRICE_TO_PLAN: Record<string, string> = {
  "price_1T9509BnbfHLJ2lEcwu2GuZu": "autonomo",
  "price_1T7HFABnbfHLJ2lE8Q916Xrm": "pyme",
  "price_1T950eBnbfHLJ2lEAZOFRDIf": "flotas",
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabaseUser
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.company_id) {
      return new Response(
        JSON.stringify({ error: "Company not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("stripe_customer_id")
      .eq("id", profile.company_id)
      .maybeSingle();

    if (!company?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ synced: false, reason: "no_stripe_customer" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const [activeSubs, trialingSubs] = await Promise.all([
      stripe.subscriptions.list({ customer: company.stripe_customer_id, status: "active", limit: 1 }),
      stripe.subscriptions.list({ customer: company.stripe_customer_id, status: "trialing", limit: 1 }),
    ]);

    const allSubs = [...activeSubs.data, ...trialingSubs.data];
    allSubs.sort((a, b) => b.created - a.created);

    if (allSubs.length === 0) {
      return new Response(
        JSON.stringify({ synced: false, reason: "no_active_subscription" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripeSub = allSubs[0];
    const priceId = stripeSub.items?.data?.[0]?.price?.id;
    const stripePlan = (priceId && PRICE_TO_PLAN[priceId]) ? PRICE_TO_PLAN[priceId] : (stripeSub.metadata?.plan || "autonomo");
    const limits = PLAN_LIMITS[stripePlan] || PLAN_LIMITS.autonomo;

    const { data: dbSub } = await supabaseAdmin
      .from("subscriptions")
      .select("pending_plan")
      .eq("company_id", profile.company_id)
      .maybeSingle();

    const hasPendingPlan = !!dbSub?.pending_plan;

    await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          company_id: profile.company_id,
          stripe_subscription_id: stripeSub.id,
          plan: stripePlan,
          status: stripeSub.status,
          document_limit: limits.document_limit,
          user_limit: limits.user_limit,
          current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: stripeSub.cancel_at_period_end ?? false,
          ...(hasPendingPlan ? {} : { pending_plan: null, pending_plan_effective_date: null }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id" }
      );

    return new Response(
      JSON.stringify({ synced: true, plan: stripePlan, already_in_sync: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("stripe-sync error:", message);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
