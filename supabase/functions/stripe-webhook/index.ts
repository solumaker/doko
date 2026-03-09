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

const ALLOWED_STATUSES = new Set([
  "active",
  "past_due",
  "canceled",
  "trialing",
  "incomplete",
  "unpaid",
]);

function sanitizeStatus(raw: string, eventId: string): string {
  if (raw === "unpaid") {
    return "past_due";
  }
  if (ALLOWED_STATUSES.has(raw)) {
    return raw;
  }
  console.warn(JSON.stringify({
    msg: "Unknown Stripe subscription status, falling back to past_due",
    raw_status: raw,
    event_id: eventId,
  }));
  return "past_due";
}

function resolvePlanFromSubscription(subscription: Stripe.Subscription): string {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  if (priceId && PRICE_TO_PLAN[priceId]) {
    return PRICE_TO_PLAN[priceId];
  }
  if (priceId) {
    console.warn(JSON.stringify({
      msg: "Unknown price ID, falling back to metadata.plan",
      price_id: priceId,
    }));
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
      console.error(JSON.stringify({ msg: "Webhook signature verification failed", error: String(err) }));
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: idempotencyError } = await supabase
      .from("stripe_processed_events")
      .insert({ event_id: event.id });

    if (idempotencyError) {
      if (idempotencyError.code === "23505") {
        return new Response(
          JSON.stringify({ received: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.warn(JSON.stringify({
        msg: "Idempotency insert failed with unexpected error, proceeding",
        event_id: event.id,
        event_type: event.type,
        error: idempotencyError.message,
      }));
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.company_id;
        if (!companyId) break;

        if (session.metadata?.type === "document_pack") {
          const { error: packError } = await supabase.from("document_packs").insert({
            company_id: companyId,
            stripe_payment_intent_id: session.payment_intent as string,
            documents_purchased: 10,
            documents_remaining: 10,
          });
          if (packError) {
            console.error(JSON.stringify({
              msg: "Failed to insert document_pack",
              event_id: event.id,
              event_type: event.type,
              company_id: companyId,
              error: packError.message,
            }));
            throw packError;
          }
          break;
        }

        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          const plan = resolvePlanFromSubscription(subscription);
          const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.autonomo;

          const { error: upsertError } = await supabase.from("subscriptions").upsert(
            {
              company_id: companyId,
              stripe_subscription_id: subscription.id,
              plan,
              status: sanitizeStatus(subscription.status, event.id),
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

          if (upsertError) {
            console.error(JSON.stringify({
              msg: "Failed to upsert subscription",
              event_id: event.id,
              event_type: event.type,
              company_id: companyId,
              plan,
              error: upsertError.message,
            }));
            throw upsertError;
          }

          try {
            await stripe.subscriptions.update(subscription.id, {
              metadata: {
                ...subscription.metadata,
                company_id: companyId,
                plan,
              },
            });
          } catch (metaErr) {
            console.error(JSON.stringify({
              msg: "Failed to update Stripe subscription metadata",
              event_id: event.id,
              event_type: event.type,
              company_id: companyId,
              error: String(metaErr),
            }));
          }
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
          } catch (scheduleErr) {
            console.error(JSON.stringify({
              msg: "Failed to fetch subscription schedule",
              event_id: event.id,
              event_type: event.type,
              company_id: companyId,
              error: String(scheduleErr),
            }));
          }
        }

        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status: sanitizeStatus(subscription.status, event.id),
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
          console.error(JSON.stringify({
            msg: "Failed to update subscription in DB",
            event_id: event.id,
            event_type: event.type,
            company_id: companyId,
            operation: "subscription_update",
            error: updateError.message,
          }));
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
          console.error(JSON.stringify({
            msg: "Failed to update Stripe subscription metadata",
            event_id: event.id,
            event_type: event.type,
            company_id: companyId,
            error: String(metaErr),
          }));
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

      case "customer.subscription.pending_update_applied": {
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

        const appliedPlan = resolvePlanFromSubscription(subscription);
        const appliedLimits = PLAN_LIMITS[appliedPlan] || PLAN_LIMITS.autonomo;

        const { error: appliedError } = await supabase
          .from("subscriptions")
          .update({
            status: sanitizeStatus(subscription.status, event.id),
            plan: appliedPlan,
            document_limit: appliedLimits.document_limit,
            user_limit: appliedLimits.user_limit,
            pending_plan: null,
            pending_plan_effective_date: null,
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", companyId);

        if (appliedError) {
          console.error(JSON.stringify({
            msg: "Failed to apply pending_update_applied",
            event_id: event.id,
            event_type: event.type,
            company_id: companyId,
            error: appliedError.message,
          }));
        }
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

        let subscription: Stripe.Subscription;
        try {
          subscription = await stripe.subscriptions.retrieve(subscriptionId);
        } catch (retrieveErr) {
          console.error(JSON.stringify({
            msg: "Failed to retrieve subscription for invoice.paid",
            event_id: event.id,
            event_type: event.type,
            stripe_subscription_id: subscriptionId,
            error: String(retrieveErr),
          }));
          throw retrieveErr;
        }

        const plan = resolvePlanFromSubscription(subscription);
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.autonomo;

        const preserveSchedule = !!subscription.schedule;

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
            cancel_at_period_end: subscription.cancel_at_period_end ?? false,
            ...(preserveSchedule ? {} : {
              pending_plan: null,
              pending_plan_effective_date: null,
            }),
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
    console.error(JSON.stringify({ msg: "stripe-webhook unhandled error", error: String(err) }));
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
