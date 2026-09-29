import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { subscriptionServices } from "./subscription.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";

const createCheckoutSession = catchAsync(
    async (req: Request, res:Response,  next:NextFunction) => {
        const userId = req.user?.id;

        const result = await subscriptionServices.createCheckoutSession(userId as string);

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Chekcout Completed Successfully!",
            data: result
        })
    }
);

export const subscriptionController = {
    createCheckoutSession
}