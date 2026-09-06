import jwt, { JwtPayload, SignOptions } from "jsonwebtoken"

const createToken = (payload: JwtPayload, secret: string, expiresIn: SignOptions) => {
    const token = jwt.sign(
        payload,
        secret,
        { expiresIn } as SignOptions
    );

    return token;
}


const verifyToken = (token: string, secret: string) => {
    try {
        const verifiedToken = jwt.verify(token, secret);
        return verifiedToken;

    } catch (error: any) {
        console.log("Token verification failed:", error)
        throw new Error(error.message);
    }
}

export const jwtUtils = {
    createToken,
    verifyToken
}