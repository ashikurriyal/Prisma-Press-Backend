//define the typescript interfaces for the request payloads.

import { CommentStatus } from "../../../generated/prisma/enums";

export interface ICreateCommentPayload {
    content: string;
    postId: string;
    authorId: string;
}

export interface IUpdateCommentPayload {
    content?: string;
    status?: CommentStatus;
}

export interface IModerateCommentPayload {
    status: CommentStatus;
}