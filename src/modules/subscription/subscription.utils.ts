import Stripe from "stripe";
import { SubscriptionStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";

//function for webhook session end time
export const getPeriodEnd = (payload: Stripe.Subscription) => {
    // const currentPeriodStart = stripeSubscription.items.data[0]?.current_period_start
    const currentPeriodEndInMiliSeconds = payload.items.data[0]?.current_period_end!;

    const currentPeriodEnd = new Date(currentPeriodEndInMiliSeconds * 1000);
    return currentPeriodEnd;
}

//function for webhook checkout completed session
export const handleCheckoutCompleted = async (session: Stripe.Checkout.Session) => {
    const userId = session.metadata?.userId;
    const stripeCustomerId = session.customer as string;
    const stripeSubscriptionId = session.subscription as string;

    if (!userId || !stripeCustomerId || !stripeSubscriptionId) {
        console.log("Webhook : Missing values for creating checkout session")
        return;
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)

    const currentPeriodEnd = getPeriodEnd(stripeSubscription)
    await prisma.subscription.upsert({
        where: {
            userId
        },
        create: {
            userId,
            stripeCustomerId,
            stripeSubscriptionId,
            status: "ACTIVE",
            currentPeriodEnd
        },
        update: {
            stripeCustomerId,
            stripeSubscriptionId,
            status: "ACTIVE",
            cancelAtPeriodEnd: false,
            currentPeriodEnd

        }
    })
}

export const handleChangeSubscription = async (payload: Stripe.Subscription) => {
    const stripeSubscriptionId = payload.id;
    const status = (payload.status === "active" || payload.status === 'trialing') ? SubscriptionStatus.ACTIVE :
        payload.status === "canceled" ? SubscriptionStatus.CANCELED :
            SubscriptionStatus.EXPIRED;


    //cancel scheduled but still active till period end (cancel_at is set when cancelled from stripe dashboard/portal)
    const cancelAtPeriodEnd = status === SubscriptionStatus.ACTIVE &&
        (payload.cancel_at_period_end || payload.cancel_at !== null);

    const currentPeriodEnd = getPeriodEnd(payload);
    const isSubscriptionExist = await prisma.subscription.findUnique({
        where: {
            stripeSubscriptionId
        }
    })
    if (!isSubscriptionExist) {
        console.log(`Webhook : No subscription found for subscription id: ${stripeSubscriptionId}`);

        return;
    }

    await prisma.subscription.update({
        where: {
            stripeSubscriptionId
        },
        data: {
            status,
            cancelAtPeriodEnd,
            currentPeriodEnd
        }
    })
}