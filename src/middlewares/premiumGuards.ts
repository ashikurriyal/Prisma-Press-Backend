import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { prisma } from "../lib/prisma";
import { SubscriptionStatus } from "../../generated/prisma/enums";

export const subscriptionGuard = () => {
    return catchAsync(
        async (req: Request, res: Response, next: NextFunction) => {
            const userId = req.user?.id
            const subscription = await prisma.subscription.findUnique({
                where: {
                    userId
                }
            });
            if (!subscription) {
                throw new Error("Please subscribe to get access to premium contents")
            }
            if (subscription?.status !== SubscriptionStatus.ACTIVE) {
                throw new Error("Please subscribe again to get access to premium contents")
            }
            next()
        }
    )
}