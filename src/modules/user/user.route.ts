import { NextFunction, Request, Response, Router } from "express";
import { userController } from "./user.controller";
import { jwtUtils } from "../../utils/jwt";
import config from "../../config";
import { Role } from "../../../generated/prisma/enums";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../lib/prisma";

const router = Router();

declare global {
    namespace Express {
        interface Request {
            user?: {
                email: string;
                name: string;
                id: string;
                role: Role;
            }
        }
    }
}


router.post("/register", userController.registerUser)

//auth(Role.ADMIN, Role.USER, Role.AUTHOR)
//auth() => ...requiredRoles => [Role.ADMIN, Role.USER, Role.AUTHOR]

const auth = (...requiredRoles: Role[]) => {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const token = req.cookies.accessToken
            || req.headers.authorization?.startsWith("Bearer ")
            ? req.headers.authorization?.split(" ")[1]
            : req.headers.authorization;

        if (!token) {
            throw new Error("You are not logged in. Please log in to access this resource");
        }

        const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret)
        if (!verifiedToken.success) {
            throw new Error(verifiedToken.error);
        }
        const { email, name, id, role } = verifiedToken.data as JwtPayload;

        if (requiredRoles.length && !requiredRoles.includes(role)) {
            throw new Error("Forbidden. You dont have permission to access this resource")
        }

        const user = await prisma.user.findUnique({
            where: {
                id,
                email,
                name,
                role
            }
        })

        if (!user) {
            throw new Error("User not found. Please log in again")
        }

        if (user.activeStatus === 'BLOCKED') {
            throw new Error("Your account has been blocked. Please contact support")
        }

        req.user = {
            email,
            name,
            id,
            role
        }

        next();
    })
}


router.get("/me",

    //     (req: Request, res: Response, next: NextFunction) => {
    //     console.log(req.cookies)
    //     const { accessToken } = req.cookies;
    //     const verifiedToken = jwtUtils.verifyToken(accessToken, config.jwt_access_secret)

    //     if (!verifiedToken.success) {
    //         throw new Error(verifiedToken.error);
    //     }
    //     const { email, name, id, role } = verifiedToken.data as JwtPayload;
    //     // const requiredRoles = ["ADMIN", "USER", "AUTHOR"]
    //     const requiredRoles = [Role.ADMIN, Role.USER, Role.AUTHOR]

    //     if (!requiredRoles.includes(role)) {
    //         return res.status(403).json({
    //             success: false,
    //             statusCode: httpStatus.FORBIDDEN,
    //             message: "Forbidden, You dont have permisssion to access this resource."
    //         })
    //     }

    //     req.user = {
    //         email,
    //         name,
    //         id,
    //         role
    //     }

    //     next();
    // }, 

    auth(Role.ADMIN, Role.USER, Role.AUTHOR),

    userController.getMyProfile)

export const userRoutes = router;