import httpStatus from "http-status";
import { AppError } from "../../utils/AppError.js";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { ILoginUser } from "./auth.interface.js"
import { JwtPayload, SignOptions } from "jsonwebtoken";
import config from "../../config/index.js";
import { jwtUtils } from "../../utils/jwt.js";

const loginUser = async (payload: ILoginUser) => {
    const { email, password } = payload;

    const user = await prisma.user.findUnique({
        where: { email }
    })
    //same message for wrong email and wrong password, so attackers can't find out which emails are registered
    if (!user) {
        throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
    }
    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
        throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password");
    }
    if (user.activeStatus === 'BLOCKED') {
        throw new AppError(httpStatus.FORBIDDEN, "Your account has been blocked. Please contact support")
    }

    const jwtPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    }

    const accessToken = jwtUtils.createToken(
        jwtPayload,
        config.jwt_access_secret,
        config.jwt_access_expires_in as SignOptions
    )

    const refreshToken = jwtUtils.createToken(
        jwtPayload,
        config.jwt_refresh_secret,
        config.jwt_refresh_expires_in as SignOptions
    )

    return {
        accessToken, refreshToken
    };
}

const refreshToken = async (refreshToken: string) => {
    if (!refreshToken) {
        throw new AppError(httpStatus.UNAUTHORIZED, "Refresh token not found. Please log in again")
    }
    const verifiedRefreshToken = jwtUtils.verifyToken(refreshToken, config.jwt_refresh_secret)

    if (!verifiedRefreshToken.success) {
        throw new AppError(httpStatus.UNAUTHORIZED, verifiedRefreshToken.error)
    }

    const { id } = verifiedRefreshToken.data as JwtPayload;

    const user = await prisma.user.findUniqueOrThrow({
        where: {
            id
        }
    })

    if (user.activeStatus === "BLOCKED") {
        throw new AppError(httpStatus.FORBIDDEN, "User is blocked")
    }

    const jwtPayload = {
        id,
        name: user.name,
        email: user.email,
        role: user.role
    }

    const accessToken = jwtUtils.createToken(
        jwtPayload,
        config.jwt_access_secret,
        config.jwt_access_expires_in as SignOptions
    )

    return { accessToken }
}

export const authService = {
    loginUser,
    refreshToken
}