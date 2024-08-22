import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  // import data from urls (connection to a url and use in our web)
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" })); // for read json data
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // for encode urls
app.use(express.static("public")); // for files and images
app.use(cookieParser());

// routes
import userRouter from "./routes/user.routes.js";

app.use("/api/v1/users", userRouter);

export { app };
