import { ApiError } from "../utils/apiError.js";
import { asynHandle } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { Users } from "../models/user.model.js";

export const verifyJWT = asynHandle(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Berarer ", "");

    if (!token) {
      throw new ApiError(401, "unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await Users.findById(decodedToken?._id).select(
      "-password -refreshToken"
    ); // exclude both

    if (!user) {
      // todo: discuss about frontend
      throw new ApiError(401, "invalis access token");
    }

    req.user = user;
    next(); // after middleware run next post req
  } catch (error) {
    throw new ApiError(401, "invalid access token");
  }
});
