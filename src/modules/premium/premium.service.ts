import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import { PostWhereInput } from "../../../generated/prisma/models.js";
import { prisma } from "../../lib/prisma.js"
import { IPostQuery, IUpdatePostPayload } from "../post/post.interface.js";
import { pick } from "../../utils/pick.js";
import { UPDATE_POST_FIELDS } from "../post/post.service.js";
import { CommentStatus, PostStatus } from "../../../generated/prisma/enums.js";

const getPremiumContent = async (query: IPostQuery) => {

    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ? query.sortBy : "createdAt";
    const sortOrder = query.sortOrder ? query.sortOrder : "desc"
    const tags = query.tags ? JSON.parse(query.tags as string) : null;
    const tagsArray = Array.isArray(tags) ? tags : []


    const andConditions: PostWhereInput[] = [];

    if (query.searchTerm) {
        andConditions.push({
            OR: [
                {
                    title: {
                        contains: query.searchTerm,
                        mode: 'insensitive'
                    },

                },
                {
                    content: {
                        contains: query.searchTerm,
                        mode: 'insensitive'
                    },
                }
            ]
        })
    }

    if (query.title) {
        andConditions.push({
            title: query.title
        })
    }
    if (query.content) {
        andConditions.push({
            content: query.content
        })
    }
    if (query.authorId) {
        andConditions.push({
            authorId: query.authorId
        })
    }
    if (query.isFeatured !== undefined) {
        andConditions.push({
            isFeatured: String(query.isFeatured) === "true"
        })
    }

    if (query.tags) {
        andConditions.push({
            tags: {
                hasSome: tagsArray
            }
        })
    }

    andConditions.push({
        isPremium: true,
        status: PostStatus.PUBLISHED
    })
    const posts = await prisma.post.findMany({
        where: {
            AND: andConditions
        },
        take: limit,
        skip: skip,
        orderBy: {
            [sortBy]: sortOrder
        },
        include: {
            author: {
                omit: { password: true },
            },
            comments: {
                where: { status: CommentStatus.APPROVED }
            },
        },
    })
    const totalPostCount = await prisma.post.count({
        where: {
            AND: andConditions
        }
    })
    return {
        data: posts,
        meta: {
            page: page,
            limit: limit,
            total: totalPostCount,
            totalPages: Math.ceil(totalPostCount / limit)
        }
    };
}

const updatePremiumPost = async (postId: string, payload: IUpdatePostPayload, authorId: string, isAdmin: boolean) => {
    const post = await prisma.post.findUniqueOrThrow({
        where: {
            id: postId,
            isPremium: true
        }
    })

    if (!isAdmin && post.authorId !== authorId) {
        throw new AppError(httpStatus.FORBIDDEN, "You are not the owner of this premium post!")
    }

    const result = await prisma.post.update({
        where: {
            id: postId
        },
        data: pick(payload as any, UPDATE_POST_FIELDS) as IUpdatePostPayload,
        include: {
            author: {
                omit: {
                    password: true
                }
            },
            comments: true
        }
    })
    return result
}

const deletePremiumPost = async (postId: string, authorId: string, isAdmin: boolean) => {
    const post = await prisma.post.findUniqueOrThrow({
        where: {
            id: postId,
            isPremium: true
        }
    })

    if (!isAdmin && post.authorId !== authorId) {
        throw new AppError(httpStatus.FORBIDDEN, "You are not the owner of this premium post!")
    }

    await prisma.post.delete({
        where: {
            id: postId
        }
    })
}

export const premiumServices = {
    getPremiumContent,
    updatePremiumPost,
    deletePremiumPost
}