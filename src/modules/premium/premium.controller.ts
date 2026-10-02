import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { premiumServices } from "./premium.service";

const getPremiumContent = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {

        const result = await premiumServices.getPremiumContent()

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Premium Content Retrived Successfully!",
            data: result
        })
    }
)

export const premiumController = {
    getPremiumContent
}