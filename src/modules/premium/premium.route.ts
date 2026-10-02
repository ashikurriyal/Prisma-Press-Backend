import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { Role } from "../../../generated/prisma/enums";
import { premiumController } from "./premium.controller";

const router = Router()

router.get("/", 
    auth(Role.USER, Role.AUTHOR, Role.ADMIN),
    premiumController.getPremiumContent
)

export const premiumRoutes = router;