import { NextFunction, Request, Response, Router } from "express";
import { auth } from "../../middlewares/auth";
import { Role, SubscriptionStatus } from "../../../generated/prisma/enums";
import { premiumController } from "./premium.controller";
import { catchAsync } from "../../utils/catchAsync";
import { prisma } from "../../lib/prisma";
import { subscriptionGuard } from "../../middlewares/premiumGuards";

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