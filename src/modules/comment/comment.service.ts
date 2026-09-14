import { CommentStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { ICreateCommentPayload, IUpdateCommentPayload } from "./comment.interface";

const getCommentsByAuthor = async (authorId: string) => {
    const comments = await prisma.comment.findMany({
        where: {
            authorId
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

const getCommentByCommentId = async (commentId: string) => {
    const comment = await prisma.comment.findUniqueOrThrow({
        where: {
            id: commentId
        },
        include: {
            post: {
                select: {
                    id: true,
                    title: true,
                    views: true
                }
            }
        }
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
        throw new Error("You are not the owner of this comment!");
    }

    const result = await prisma.comment.update({
        where: {
            id: commentId
        },
        data: payload
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
        throw new Error("You are not the owner of this comment!");
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
        throw new Error(`Comment is already marked as ${status}`);
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
    getCommentByCommentId,
    createComment,
    updateComment,
    deleteComment,
    moderateComment
}