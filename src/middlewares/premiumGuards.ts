import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync.js";
import { prisma } from "../lib/prisma.js";
import { SubscriptionStatus } from "../../generated/prisma/enums.js";
import { AppError } from "../utils/AppError.js";
import httpStatus from "http-status";

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
                throw new AppError(httpStatus.FORBIDDEN, "Please subscribe to get access to premium contents")
            }
            if (subscription?.status !== SubscriptionStatus.ACTIVE) {
                throw new AppError(httpStatus.FORBIDDEN, "Please subscribe again to get access to premium contents")
            }
            next()
        }
    )
}