import { NextFunction, Request, Response } from "express"
import httpStatus from "http-status";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../utils/AppError.js";
import config from "../config/index.js";

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {

    let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
    let errorMessage = err.message || "Internal Server Error";
    let errorName = err.name || "Internal Server Error";

    if (err instanceof AppError) {
        statusCode = err.statusCode;

    } else if (err instanceof Prisma.PrismaClientValidationError) {
        statusCode = httpStatus.BAD_REQUEST;
        errorMessage = "You have provided incorrect field type or missing fields";

    } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
            statusCode = httpStatus.CONFLICT;
            errorMessage = "Duplicate Key Error";
        } else if (err.code === "P2003") {
            statusCode = httpStatus.BAD_REQUEST;
            errorMessage = "Foreign Key Constraint failed";
        } else if (err.code === "P2025") {
            statusCode = httpStatus.NOT_FOUND;
            errorMessage = "The requested record was not found";
        } else {
            errorMessage = "Error occurred during query execution";
        }
    } else if (err instanceof Prisma.PrismaClientInitializationError) {
        if (err.errorCode === "P1000") {
            errorMessage = "Authentication failed against database server. please check your credentials";
        } else if (err.errorCode === "P1001") {
            errorMessage = "Cant reach database server";
        }
    }

    // log only unexpected errors, 4xx errors are normal client mistakes
    if (statusCode >= 500) {
        console.error(err);
    }

    res.status(statusCode).json({
        success: false,
        statusCode,
        name: errorName,
        message: errorMessage,
        // never send the stack trace to clients in production
        error: config.node_env === "production" ? undefined : err.stack
    })
}
