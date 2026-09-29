import Stripe from "stripe"
import config from "../../config"
import { prisma } from "../../lib/prisma"
import { stripe } from "../../lib/stripe"

const createCheckoutSession = async (userId: string) => {
    const transactionResult = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUniqueOrThrow({
            where: {
                id: userId
            },
            include: {
                subscription: true
            }
        })
        //old subscriber
        let stripeCustomerId = user.subscription?.stripeCustomerId

        if (!stripeCustomerId) {
            //new subscriber
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: { userId: user.id }
            });

            stripeCustomerId = customer.id;
        }

        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price: config.stripe_product_price_id,
                    quantity: 1
                }
            ],
            mode: "subscription",
            customer: stripeCustomerId,
            payment_method_types: ["card"],
            success_url: `${config.app_url}/premium?success=true`,
            cancel_url: `${config.app_url}/premium?success=false`,
            metadata: { userId: user.id }
        })

        return session.url

    })

    return {
        paymentUrl: transactionResult
    }
}


const handleWebhook = async (payload: Buffer, signature: string) => {

    const endpointSecret = config.stripe_webhook_secret
    const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret
    );

    // Handle the event
    switch (event.type) {
        //occurs when a checkout session has been successfully completed
        //event.data.object;
        case 'checkout.session.completed':
            await handleCheckoutCompleted(event.data.object)

            break;
        case 'customer.subscription.updated':
            //occurs whenever a subscription changes (e.g., switching from one plan to anohter, or changing the status from trial to active)

            break;

        case 'customer.subscription.deleted':
            //occurs whenever a customer's subscription ends;
            break;
        default:
            // Unexpected event type
            console.log(`No event matched. Unhandled event type ${event.type}.`);
            break;
    }

}

//function for webhook session end time
const getPeriodEnd = (payload: Stripe.Subscription) => {
    // const currentPeriodStart = stripeSubscription.items.data[0]?.current_period_start
    const currentPeriodEndInMiliSeconds = payload.items.data[0]?.current_period_end!;

    const currentPeriodEnd = new Date(currentPeriodEndInMiliSeconds * 1000);
    return currentPeriodEnd;
}

//function for webhook checkout completed session
const handleCheckoutCompleted = async (session: Stripe.Checkout.Session) => {
    const userId = session.metadata?.userId;
    const stripeCustomerId = session.customer as string;
    const stripeSubscriptionId = session.subscription as string;

    if (!userId || !stripeCustomerId || !stripeSubscriptionId) {
        throw new Error("Webhook Failed");
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
            currentPeriodEnd

        }
    })
}


export const subscriptionServices = {
    createCheckoutSession,
    handleWebhook
}