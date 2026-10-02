import { Router } from "express";
import { subscriptionController } from "./subscription.controller.js";
import { auth } from "../../middlewares/auth.js";
import { Role } from "../../../generated/prisma/enums.js";

const router = Router();

router.post(
    "/checkout",
    auth(Role.USER, Role.AUTHOR, Role.ADMIN),
    subscriptionController.createCheckoutSession)


//cancel subscription
router.post("/cancel",
    auth(Role.USER, Role.AUTHOR, Role.ADMIN),
    subscriptionController.cancelSubscription
)

router.post("/webhook", subscriptionController.handleWebhook);
router.get("/status",
    auth(Role.USER, Role.AUTHOR, Role.ADMIN),
    subscriptionController.getSubscriptionStatus
)

export const subscriptionRoutes = router;