import { Router } from "express";
import { userController } from "./user.controller.js";
import { Role } from "../../../generated/prisma/enums.js";
import { auth } from "../../middlewares/auth.js";

const router = Router();

router.post("/register", userController.registerUser)

router.get("/me", auth(Role.ADMIN, Role.USER, Role.AUTHOR),
    userController.getMyProfile);

router.put("/my-profile", auth(Role.ADMIN, Role.USER, Role.AUTHOR),
    userController.updateMyProfile);
    
export const userRoutes = router;