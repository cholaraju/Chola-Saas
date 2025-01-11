import { prisma } from "@/app/lib/db";
import { stripe } from "@/app/lib/stripe";
import { headers } from "next/headers";
import Stripe from "stripe";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = (await headers()).get("Stripe-Signature");

    if (!signature) {
      return new Response("No signature found", { status: 400 });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error: unknown) {
      console.error("Webhook error:", error);
      return new Response("Webhook error", { status: 400 });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    if (event.type === "checkout.session.completed") {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const customerId = String(session.customer);

        const user = await prisma.user.findUnique({
          where: {
            stripeCustomerId: customerId,
          },
        });

        if (!user) {
          return new Response(`User not found for customerId: ${customerId}`, { status: 404 });
        }

        await prisma.subscription.create({
          data: {
            stripeSubscriptionId: subscription.id,
            userId: user.id,
            currentPeriodStart: String(subscription.current_period_start),
            currentPeriodEnd: String(subscription.current_period_end),
            status: subscription.status,
            planId: subscription.items.data[0].plan.id,
            interval: String(subscription.items.data[0].plan.interval),
          },
        });
      } catch (error) {
        console.error("Error processing checkout.session.completed:", error);
        return new Response("Error processing subscription", { status: 500 });
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        await prisma.subscription.update({
          where: {
            stripeSubscriptionId: subscription.id,
          },
          data: {
            planId: subscription.items.data[0].price.id,
            currentPeriodStart: String(subscription.current_period_start),
            currentPeriodEnd: String(subscription.current_period_end),
            status: subscription.status,
          },
        });
      } catch (error) {
        console.error("Error processing invoice.payment_succeeded:", error);
        return new Response("Error updating subscription", { status: 500 });
      }
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}