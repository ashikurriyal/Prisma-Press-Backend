import { NextFunction, Request, Response, Router } from "express";
import { auth } from "../../middlewares/auth.js";
import { Role, SubscriptionStatus } from "../../../generated/prisma/enums.js";
import { premiumController } from "./premium.controller.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { prisma } from "../../lib/prisma.js";
import { subscriptionGuard } from "../../middlewares/premiumGuards.js";

const router = Router()

router.get("/",
    auth(Role.USER, Role.AUTHOR, Role.ADMIN),
    subscriptionGuard(),
    premiumController.getPremiumContent
)

router.patch("/:postId",
    auth(Role.USER, Role.AUTHOR, Role.ADMIN),
    subscriptionGuard(),
    premiumController.updatePremiumPost
)

router.delete("/:postId",
    auth(Role.USER, Role.AUTHOR, Role.ADMIN),
    subscriptionGuard(),
    premiumController.deletePremiumPost
)

export const premiumRoutes = router;