import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";
import { commentController } from "./comment.controller";

const router = Router();

// Public routes
router.get("/author/:authorId", commentController.getCommentsByAuthor);
router.get("/:commentId", commentController.getCommentByCommentId);

// USER or ADMIN routes
router.post("/", auth(Role.USER, Role.ADMIN), commentController.createComment);
router.patch("/:commentId", auth(Role.USER, Role.ADMIN), commentController.updateComment);
router.delete("/:commentId", auth(Role.USER, Role.ADMIN), commentController.deleteComment);

// ADMIN only routes
router.patch("/:commentId/moderate", auth(Role.ADMIN), commentController.moderateComment);

export const commentRoutes = router;