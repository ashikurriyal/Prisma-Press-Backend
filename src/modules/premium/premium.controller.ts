import { AppError } from "../../utils/AppError.js";
import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import httpStatus from "http-status";
import { premiumServices } from "./premium.service.js";

const getPremiumContent = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const query = req.query;
        const result = await premiumServices.getPremiumContent(query)

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Premium Content Retrived Successfully!",
            data: result.data,
            meta: result.meta
        })
    }
)

const updatePremiumPost = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const authorId = req.user?.id;
        const isAdmin = req.user?.role === "ADMIN";

        const postId = req.params.postId;
        if (!postId) {
            throw new AppError(httpStatus.BAD_REQUEST, "Post Id Required in Params")
        }
        const payload = req.body;
        const result = await premiumServices.updatePremiumPost(postId as string, payload, authorId as string, isAdmin)

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Premium Post Updated Successfully!",
            data: result
        })
    }
)

const deletePremiumPost = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const authorId = req.user?.id;
        const isAdmin = req.user?.role === "ADMIN";

        const postId = req.params.postId;
        if (!postId) {
            throw new AppError(httpStatus.BAD_REQUEST, "Post Id Required in Params")
        }
        await premiumServices.deletePremiumPost(postId as string, authorId as string, isAdmin)

        sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: "Premium Post Deleted Successfully!",
            data: null
        })
    }
)

export const premiumController = {
    getPremiumContent,
    updatePremiumPost,
    deletePremiumPost
}