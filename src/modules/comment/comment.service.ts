import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
//handles the database logic, ownership validation, and business rules

import { CommentStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { ICreateCommentPayload, IUpdateCommentPayload } from "./comment.interface.js";

const getCommentsByAuthor = async (authorId: string) => {
    const comments = await prisma.comment.findMany({
        where: {
            authorId,
            status: CommentStatus.APPROVED
        },
        orderBy: {
            createdAt: "desc"
        },
        include: {
            post: true
        }
    });
    return comments;
}

const getCommentByPostId = async (postId: string) => {
    const comment = await prisma.comment.findMany({
        where: {
            postId,
            status: CommentStatus.APPROVED
        },
        orderBy: {
            createdAt: "desc"
        },
        // include: {
        //     post: {
        //         select: {
        //             id: true,
        //             title: true,
        //             views: true
        //         }
        //     }
        // }
    });
    return comment;
}

const createComment = async (payload: ICreateCommentPayload, authorId: string) => {
    // Make sure the post exists before creating the comment
    await prisma.post.findUniqueOrThrow({
        where: {
            id: payload.postId
        }
    });

    const result = await prisma.comment.create({
        data: {
            content: payload.content,
            postId: payload.postId,
            authorId,
            status: CommentStatus.APPROVED
        }
    });
    return result;
}

const updateComment = async (commentId: string, payload: IUpdateCommentPayload, authorId: string) => {
    const comment = await prisma.comment.findUniqueOrThrow({
        where: {
            id: commentId
        }
    });

    // Enforce ownership check
    if (comment.authorId !== authorId) {
        throw new AppError(httpStatus.FORBIDDEN, "You are not the owner of this comment!");
    }

    const result = await prisma.comment.update({
        where: {
            id: commentId
        },
        //only content can be edited here, status is changed through the moderate route
        data: {
            content: payload.content
        }
    });
    return result;
}

const deleteComment = async (commentId: string, authorId: string) => {
    const comment = await prisma.comment.findUniqueOrThrow({
        where: {
            id: commentId
        }
    });

    // Enforce ownership check
    if (comment.authorId !== authorId) {
        throw new AppError(httpStatus.FORBIDDEN, "You are not the owner of this comment!");
    }

    await prisma.comment.delete({
        where: {
            id: commentId
        }
    });
}

const moderateComment = async (commentId: string, status: CommentStatus) => {
    const comment = await prisma.comment.findUniqueOrThrow({
        where: {
            id: commentId
        }
    });

    if (comment.status === status) {
        throw new AppError(httpStatus.BAD_REQUEST, `Comment is already marked as ${status}`);
    }

    const result = await prisma.comment.update({
        where: {
            id: commentId
        },
        data: {
            status
        }
    });
    return result;
}

export const commentService = {
    getCommentsByAuthor,
    getCommentByPostId,
    createComment,
    updateComment,
    deleteComment,
    moderateComment
}