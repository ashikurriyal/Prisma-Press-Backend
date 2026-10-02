import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import config from "../../config/index.js"
import { prisma } from "../../lib/prisma.js"
import { stripe } from "../../lib/stripe.js"
import { getPeriodEnd, handleChangeSubscription, handleCheckoutCompleted } from "./subscription.utils.js"
import { SubscriptionStatus } from "../../../generated/prisma/enums.js"

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
            success_url: `${config.client_url}/premium?success=true`,
            cancel_url: `${config.client_url}/premium?success=false`,
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
            await handleChangeSubscription(event.data.object);
            break;

        /*
        to test this run this command in cli 
        stripe subscriptions cancel sub_id(paste existing subscribed sub_id)
        */

        case 'customer.subscription.deleted':
            //occurs whenever a customer's subscription ends;
            await handleChangeSubscription(event.data.object);
            break;
        default:
            // Unexpected event type
            console.log(`No event matched. Unhandled event type ${event.type}.`);
            break;
    }

}


const getSubscriptionStatus = async (userId: string) => {
    const isSubscriptionExist = await prisma.subscription.findUniqueOrThrow({
        where: {
            userId
        }
    })

    const isActive = isSubscriptionExist.status === "ACTIVE" &&
        isSubscriptionExist.currentPeriodEnd && new Date(isSubscriptionExist.currentPeriodEnd) > new Date();

        return {
            status: isSubscriptionExist.status,
            isSubscribed: isActive,
            cancelAtPeriodEnd: isSubscriptionExist.cancelAtPeriodEnd,
            currentPeriodEnd: isSubscriptionExist.currentPeriodEnd
        }
}

const cancelSubscription = async (userId: string) => {
    const subscription = await prisma.subscription.findUnique({
        where: {
            userId
        }
    })

    if (!subscription) {
        throw new AppError(httpStatus.NOT_FOUND, "You don't have any subscription to cancel")
    }
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
        throw new AppError(httpStatus.BAD_REQUEST, "Your subscription is not active")
    }
    if (subscription.cancelAtPeriodEnd) {
        throw new AppError(httpStatus.BAD_REQUEST, "Your subscription is already scheduled to cancel")
    }

    //cancel at the end of billing period, so user keeps access for the time already paid
    //stripe will fire customer.subscription.updated now and customer.subscription.deleted at period end
    const stripeSubscription = await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        { cancel_at_period_end: true }
    )

    //update db right away, webhook will sync the same values again
    const result = await prisma.subscription.update({
        where: {
            userId
        },
        data: {
            cancelAtPeriodEnd: true,
            currentPeriodEnd: getPeriodEnd(stripeSubscription)
        }
    })

    return {
        status: result.status,
        cancelAtPeriodEnd: result.cancelAtPeriodEnd,
        currentPeriodEnd: result.currentPeriodEnd
    }
}

export const subscriptionServices = {
    createCheckoutSession,
    handleWebhook,
    getSubscriptionStatus,
    cancelSubscription
}