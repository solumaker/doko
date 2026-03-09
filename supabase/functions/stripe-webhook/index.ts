import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import Stripe from "npm:stripe@14.14.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PLAN_LIMITS: Record<string, { document_limit: number; user_limit: number }> = {
  autonomo: { document_limit: 100, user_limit: 1 },
  pyme: { document_limit: 500, user_limit: 3 },
  flotas: { document_limit: 2500, user_limit: 10 },
};

const PRICE_TO_PLAN: Record<string, string> = {
  "price_1T7ennBnbfHLJ2lEttin2U6U": "autonomo",
  "price_1T7HOaBnbfHLJ2lE0ks9Mm3O": "pyme",
  "price_1T7eoABnbfHLJ2lEutKrGJVV": "flotas",
};

function resolvePlanFromSubscription(subscription: Stripe.Subscription): string {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  if (priceId && PRICE_TO_PLAN[priceId]) {
    return PRICE_TO_PLAN[priceId];
  }
  if (priceId) {
    console.warn(`Unknown price ID: ${priceId}, falling back to metadata.plan`);
  }
  return subscription.metadata?.plan || "autonomo";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing stripe signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.company_id;
        if (!companyId) break;

        if (session.metadata?.type === "document_pack") {
          await supabase.from("document_packs").insert({
            company_id: companyId,
            stripe_payment_intent_id: session.payment_intent as string,
            documents_purchased: 10,
            documents_remaining: 10,
          });
          break;
        }

        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          const plan = resolvePlanFromSubscription(subscription);
          const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.autonomo;

          await supabase.from("subscriptions").upsert(
            {
              company_id: companyId,
              stripe_subscription_id: subscription.id,
              plan,
              status: subscription.status as string,
              document_limit: limits.document_limit,
              user_limit: limits.user_limit,
              current_period_start: new Date(
                subscription.current_period_start * 1000
              ).toISOString(),
              current_period_end: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
              cancel_at_period_end: false,
              pending_plan: null,
              pending_plan_effective_date: null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "company_id" }
          );

          await stripe.subscriptions.update(subscription.id, {
            metadata: {
              ...subscription.metadata,
              company_id: companyId,
              plan,
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        let companyId = subscription.metadata?.company_id;
        if (!companyId) {
          const { data: subRow } = await supabase
            .from("subscriptions")
            .select("company_id")
            .eq("stripe_subscription_id", subscription.id)
            .maybeSingle();
          companyId = subRow?.company_id ?? null;
        }
        if (!companyId) break;

        const newPlan = resolvePlanFromSubscription(subscription);
        const newLimits = PLAN_LIMITS[newPlan] || PLAN_LIMITS.autonomo;

        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        let pendingPlan: string | null = null;
        let pendingPlanEffectiveDate: string | null = null;

        if (subscription.schedule) {
          try {
            const schedule = await stripe.subscriptionSchedules.retrieve(
              subscription.schedule as string
            );
            if (
              schedule.status === "active" &&
              Array.isArray(schedule.phases) &&
              schedule.phases.length >= 2
            ) {
              const nextPhase = schedule.phases[1];
              if (nextPhase?.items?.[0]?.price) {
                const priceId = typeof nextPhase.items[0].price === "string"
                  ? nextPhase.items[0].price
                  : (nextPhase.items[0].price as Stripe.Price).id;
                pendingPlan = PRICE_TO_PLAN[priceId] ?? null;
                if (pendingPlan && nextPhase.start_date) {
                  pendingPlanEffectiveDate = new Date(nextPhase.start_date * 1000).toISOString();
                }
              }
            }
          } catch (_scheduleErr) {
            // schedule fetch failed, proceed without pending plan
          }
        }

        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status: subscription.status as string,
            plan: newPlan,
            document_limit: newLimits.document_limit,
            user_limit: newLimits.user_limit,
            current_period_start: new Date(
              subscription.current_period_start * 1000
            ).toISOString(),
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: subscription.cancel_at_period_end ?? false,
            pending_plan: pendingPlan,
            pending_plan_effective_date: pendingPlanEffectiveDate ?? (pendingPlan ? currentPeriodEnd : null),
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", companyId);

        if (updateError) {
          console.error("Failed to update subscription in DB:", updateError);
        }

        try {
          await stripe.subscriptions.update(subscription.id, {
            metadata: {
              ...subscription.metadata,
              company_id: companyId,
              plan: newPlan,
            },
          });
        } catch (metaErr) {
          console.error("Failed to update Stripe subscription metadata:", metaErr);
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        let companyId = subscription.metadata?.company_id;
        if (!companyId) {
          const { data: subRow } = await supabase
            .from("subscriptions")
            .select("company_id")
            .eq("stripe_subscription_id", subscription.id)
            .maybeSingle();
          companyId = subRow?.company_id ?? null;
        }
        if (!companyId) break;

        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            cancel_at_period_end: false,
            pending_plan: null,
            pending_plan_effective_date: null,
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", companyId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const plan = resolvePlanFromSubscription(subscription);
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.autonomo;

        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            plan,
            document_limit: limits.document_limit,
            user_limit: limits.user_limit,
            current_period_start: new Date(
              subscription.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
            cancel_at_period_end: false,
            pending_plan: null,
            pending_plan_effective_date: null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);
        break;
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("stripe-webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
