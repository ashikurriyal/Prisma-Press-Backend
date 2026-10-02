import express, { Application, NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "./config/index.js";
import { userRoutes } from "./modules/user/user.route.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { postRoutes } from "./modules/post/post.route.js";
import { commentRoutes } from "./modules/comment/comment.route.js";
import { notFound } from "./middlewares/notFound.js";
import { globalErrorHandler } from "./middlewares/globalErrorHandler.js";
import { subscriptionRoutes } from "./modules/subscription/subscription.route.js";
import { premiumRoutes } from "./modules/premium/premium.route.js";


const app: Application = express();
app.use(cors({
    origin: config.client_url,
    credentials: true,
}))

app.use("/api/subscription/webhook", express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())

app.get("/", (req: Request, res: Response) => {
    res.send("Prisma Press is Running!");
});

// app.post()


app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/subscription", subscriptionRoutes)
app.use("/api/premium", premiumRoutes)


app.use(notFound);
app.use(globalErrorHandler)

export default app;