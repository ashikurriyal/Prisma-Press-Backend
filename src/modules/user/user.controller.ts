import { NextFunction, Request, RequestHandler, Response } from "express";
import httpStatus from "http-status";
import { userService } from "./user.service";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import config from "../../config";
import { jwtUtils } from "../../utils/jwt";

const registerUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;

    const user = await userService.registerUserIntoDB(payload);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "User registered successfully",
        data: {
            user
        }
    })
})

const getMyProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {

    // const { accessToken } = req.cookies;
    // console.log(req.user, "User Request from my Profile")


    // const verifiedToken = jwtUtils.verifyToken(accessToken, config.jwt_access_secret)
    // if (typeof verifiedToken === "string") {
    //     throw new Error(verifiedToken);
    // }

    const profile = await userService.getMyProfileFromDB(req.user?.id as string)

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "User profile fetched successfully",
        data: { profile }
    })
})


export const userController = {
    registerUser,
    getMyProfile
}