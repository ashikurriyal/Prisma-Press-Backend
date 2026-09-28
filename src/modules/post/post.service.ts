import { CommentStatus, PostStatus } from "../../../generated/prisma/enums"
import { prisma } from "../../lib/prisma"
import { ICreatePostPayload, IUpdatePostPayload } from "./post.interface"

const createPost = async (payload: ICreatePostPayload, userId: string) => {
    const result = await prisma.post.create({
        data: {
            ...payload,
            authorId: userId
        }
    })

    return result
}

/**
 * ============================================================
 *  PRISMA SEARCHING & FILTERING — PRACTICE NOTES
 * ============================================================
 *
 *  Quick rules:
 *    field: "x"                                   → EXACT match (same as { equals: "x" })
 *    field: { contains: "x" }                     → PARTIAL match (x appears anywhere)
 *    field: { contains: "x", mode: "insensitive" } → partial match, ignores upper/lower case
 *    AND: [ ... ]                                 → ALL conditions must be true
 *    OR:  [ ... ]                                 → AT LEAST ONE condition must be true
 *
 *  Examples 1–4 are kept below for reference.
 *  Uncomment ONE `where` at a time to try it (and comment out the active one).
 * ============================================================
 */
const getAllPosts = async () => {
    const posts = await prisma.post.findMany({

        // ------------------------------------------------------------
        // 1) FILTERING — exact match with AND
        //    Returns posts whose title is EXACTLY "My First Post"
        //    AND whose content is EXACTLY the given sentence.
        // ------------------------------------------------------------
        // where: {
        //     AND: [
        //         { title: "My First Post" },
        //         { content: "This is the content of my first post." },
        //     ],
        // },

        // ------------------------------------------------------------
        // 2) SEARCHING — partial match on ONE field
        //    Returns posts whose title contains "messi" (any case).
        // ------------------------------------------------------------
        // where: {
        //     title: { contains: "Messi", mode: "insensitive" },
        // },

        // ------------------------------------------------------------
        // 3) SEARCHING — partial match on MANY fields with OR
        //    Returns posts where the title OR the content contains "messi".
        // ------------------------------------------------------------
        // where: {
        //     OR: [
        //         { title: { contains: "Messi", mode: "insensitive" } },
        //         { content: { contains: "Messi", mode: "insensitive" } },
        //     ],
        // },

        // ------------------------------------------------------------
        // 4) Partial match on MANY fields with AND
        //    Returns posts where the title AND the content BOTH contain "messi".
        // ------------------------------------------------------------
        // where: {
        //     AND: [
        //         { title: { contains: "Messi", mode: "insensitive" } },
        //         { content: { contains: "Messi", mode: "insensitive" } },
        //     ],
        // },

        // ------------------------------------------------------------
        // 5) SEARCHING + FILTERING together  ✅ (currently active)
        //    Search : title OR content contains "mes"
        //    Filter : AND the title must also contain "messi"
        // ------------------------------------------------------------
        where: {
            AND: [
                // search part
                {
                    OR: [
                        { title: { contains: "Mes", mode: "insensitive" } },
                        { content: { contains: "Mes", mode: "insensitive" } },
                    ],
                },

                // filter part
                { title: { contains: "Messi", mode: "insensitive" } },
                // { content: { contains: "Messi", mode: "insensitive" } },
            ],
        },

        include: {
            author: {
                omit: { password: true },
            },
            comments: true,
        },
    });

    return posts;
}

const getPostById = async (postId: string) => {

    const transactionResult = await prisma.$transaction(
        async (tx) => {
            await tx.post.update({
                where: {
                    id: postId
                },
                data: {
                    views: {
                        increment: 1
                    }
                }
            });
            // throw new Error("fake error");
            const post = await tx.post.findUniqueOrThrow({
                where: {
                    id: postId
                },
                include: {
                    author: {
                        omit: {
                            password: true
                        }
                    },
                    comments: {
                        where: {
                            status: CommentStatus.APPROVED
                        },
                        orderBy: {
                            createdAt: "desc"
                        }
                    },
                    _count: {
                        select: {
                            comments: true
                        }
                    }
                }
            });
            return post;
        }
    );

    return transactionResult;
}

const updatePost = async (postId: string, payload: IUpdatePostPayload, authorId: string, isAdmin: boolean) => {
    const post = await prisma.post.findUniqueOrThrow({
        where: {
            id: postId
        }
    })

    if (!isAdmin && post.authorId !== authorId) {
        throw new Error("You are not the owner of this post!")
    }

    const result = await prisma.post.update({
        where: {
            id: postId
        },
        data: payload,
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


const deletePost = async (postId: string, authorId: string, isAdmin: boolean) => {
    const post = await prisma.post.findUniqueOrThrow({
        where: {
            id: postId
        }
    })
    if (!isAdmin && post.authorId !== authorId) {
        throw new Error("You are not the owner of this post!")
    }

    await prisma.post.delete({
        where: {
            id: postId
        }
    })

}

const getPostsStats = async () => {
    const transactionResult = await prisma.$transaction(
        async (tx) => {
            // const totalPosts = await tx.post.count();

            // const totalPublishedPosts = await tx.post.count({
            //     where: {
            //         status: PostStatus.PUBLISHED
            //     }
            // })
            // const totalDraftPosts = await tx.post.count({
            //     where: {
            //         status: PostStatus.DRAFT
            //     }
            // })
            // const totalArchivedPosts = await tx.post.count({
            //     where: {
            //         status: PostStatus.ARCHIVED
            //     }
            // })

            // const totalComments = await tx.comment.count();

            // const totalApprovedComments = await tx.comment.count({
            //     where: {
            //         status: CommentStatus.APPROVED
            //     }
            // })
            // const totalRejectedComments = await tx.comment.count({
            //     where: {
            //         status: CommentStatus.REJECT
            //     }
            // })

            //not a good option- if 10lakh post view then not working
            // const allPosts = await tx.post.findMany();
            // let totalPostViews = 0;
            // allPosts.forEach((post)=>{
            //     totalPostViews = totalPostViews + post.views
            // })

            //using aggregate count the numerical in from db
            // const totalPostViewsAggregate = await tx.post.aggregate({
            //     _sum: {
            //         views: true
            //     }
            // })

            // const totalPostViews = totalPostViewsAggregate._sum.views

            // return {
            //     totalPosts,
            //     totalPublishedPosts,
            //     totalDraftPosts,
            //     totalArchivedPosts,
            //     totalComments,
            //     totalApprovedComments,
            //     totalRejectedComments,
            //     totalPostViews
            // }


            const [
                totalPosts,
                totalPublishedPosts,
                totalDraftPosts,
                totalArchivedPosts,
                totalComments,
                totalApprovedComments,
                totalRejectedComments,
                totalPostViewsAggregate
            ] = await Promise.all([
                await tx.post.count(),
                await tx.post.count({
                    where: {
                        status: PostStatus.PUBLISHED
                    }
                }),
                await tx.post.count({
                    where: {
                        status: PostStatus.DRAFT
                    }
                }),
                await tx.post.count({
                    where: {
                        status: PostStatus.ARCHIVED
                    }
                }),
                await tx.comment.count(),
                await tx.comment.count({
                    where: {
                        status: CommentStatus.APPROVED
                    }
                }),
                await tx.comment.count({
                    where: {
                        status: CommentStatus.REJECT
                    }
                }),
                await tx.post.aggregate({
                    _sum: {
                        views: true
                    }
                })
            ]);

            return {
                totalPosts,
                totalPublishedPosts,
                totalDraftPosts,
                totalArchivedPosts,
                totalComments,
                totalApprovedComments,
                totalRejectedComments,
                totalPostViews: totalPostViewsAggregate._sum.views
            }
        }
    )

    return transactionResult
}

const getMyPosts = async (authorId: string) => {
    const result = await prisma.post.findMany({
        where: {
            authorId
        },
        orderBy: {
            createdAt: "desc"
        },
        include: {
            comments: true,
            author: {
                omit: {
                    password: true
                }
            },

            _count: {
                select: {
                    comments: true
                }
            }
        }
    })

    return result;
}

export const postService = {
    createPost,
    getAllPosts,
    getPostById,
    updatePost,
    deletePost,
    getPostsStats,
    getMyPosts
}


