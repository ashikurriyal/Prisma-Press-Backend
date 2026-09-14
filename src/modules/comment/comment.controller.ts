//connects the incoming HTTP requests to the service layer and returns formatted responses using your sendResponse and catchAsync utilities.

import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import httpStatus from "http-status";
import { commentService } from "./comment.service";
import { sendResponse } from "../../utils/sendResponse";

const getCommentsByAuthor = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authorId = req.params.authorId;
    if (!authorId) {
        throw new Error("Author Id Required in Params");
    }

    const result = await commentService.getCommentsByAuthor(authorId as string);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Comments retrieved successfully",
        data: result
    });
});

const getCommentByCommentId = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const commentId = req.params.commentId;
    if (!commentId) {
        throw new Error("Comment Id Required in Params");
    }

    const result = await commentService.getCommentByCommentId(commentId as string);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Comment retrieved successfully",
        data: result
    });
});

const createComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authorId = req.user?.id;
    const payload = req.body;

    const result = await commentService.createComment(payload, authorId as string);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "Comment Created Successfully",
        data: result
    });
});

const updateComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authorId = req.user?.id;
    const commentId = req.params.commentId;
    const payload = req.body;

    if (!commentId) {
        throw new Error("Comment Id Required in Params");
    }

    const result = await commentService.updateComment(commentId as string, payload, authorId as string);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Comment Updated successfully",
        data: result
    });
});

const deleteComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authorId = req.user?.id;
    const commentId = req.params.commentId;

    if (!commentId) {
        throw new Error("Comment Id Required in Params");
    }

    await commentService.deleteComment(commentId as string, authorId as string);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Comment Deleted successfully",
        data: null
    });
});

const moderateComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const commentId = req.params.commentId;
    const { status } = req.body;

    if (!commentId) {
        throw new Error("Comment Id Required in Params");
    }
    if (!status) {
        throw new Error("Status is required in request body");
    }

    const result = await commentService.moderateComment(commentId as string, status);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Comment Moderated successfully",
        data: result
    });
});

export const commentController = {
    getCommentsByAuthor,
    getCommentByCommentId,
    createComment,
    updateComment,
    deleteComment,
    moderateComment
}