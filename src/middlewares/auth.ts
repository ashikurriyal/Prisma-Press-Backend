import { NextFunction, Request, Response } from "express";
import { Role } from "../../generated/prisma/enums.js";
import { catchAsync } from "../utils/catchAsync.js";
import { jwtUtils } from "../utils/jwt.js";
import config from "../config/index.js";
import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/AppError.js";
import httpStatus from "http-status";

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

//auth(Role.ADMIN, Role.USER, Role.AUTHOR)
//auth() => ...requiredRoles => [Role.ADMIN, Role.USER, Role.AUTHOR]
export const auth = (...requiredRoles: Role[]) => {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const token = req.cookies.accessToken ? req.cookies.accessToken
            : req.headers.authorization?.startsWith("Bearer ")
                ? req.headers.authorization?.split(" ")[1]
                : req.headers.authorization;

        if (!token) {
            throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in. Please log in to access this resource");
        }

        const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret)
        if (!verifiedToken.success) {
            throw new AppError(httpStatus.UNAUTHORIZED, verifiedToken.error);
        }

        const { id } = verifiedToken.data as JwtPayload;

        //look up by id only, name/email/role can change after the token was issued
        const user = await prisma.user.findUnique({
            where: {
                id
            }
        })
        if (!user) {
            throw new AppError(httpStatus.UNAUTHORIZED, "User not found. Please log in again")
        }
        if (user.activeStatus === 'BLOCKED') {
            throw new AppError(httpStatus.FORBIDDEN, "Your account has been blocked. Please contact support")
        }

        //check the role from the db, not from the token, so role changes apply immediately
        if (requiredRoles.length && !requiredRoles.includes(user.role)) {
            throw new AppError(httpStatus.FORBIDDEN, "Forbidden. You dont have permission to access this resource")
        }

        req.user = {
            email: user.email,
            name: user.name,
            id: user.id,
            role: user.role
        }

        next();
    })
}