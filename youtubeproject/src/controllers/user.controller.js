import { asynHandle } from "../utils/asyncHandler.js"; // for web req
import { ApiError } from "../utils/apiError.js";
import { Users } from "../models/user.model.js"; // Ensure this is only imported once
import { uploadOnCloudinary } from "../utils/fileUpload.js";
import { ApiResponse } from "../utils/ApiRes.js";
// import { verifyJWT } from "../middlewares/auth.middleware.js";
import jwt from "jsonwebtoken";
import mongoose, { Mongoose } from "mongoose";

const generateAccessRefreshToken = async (userId) => {
  try {
    const user = await Users.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "someting went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asynHandle(async (req, res) => {
  const { fullName, email, username, password } = req.body;
  console.log("email:", email);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all fields are required");
  }

  const existedUser = await Users.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "user already exists");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "avatar upload failed");
  }

  const user = await Users.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    username: username.toLowerCase(),
    password,
  });

  const createdUser = await Users.findById(user._id).select(
    "-password -refreshToken" // exclude both
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registered successfully..."));
});

const loginUser = asynHandle(async (req, res) => {
  const { email, username, password } = req.body;
  if (!username && !email) {
    throw new ApiError(400, "username or email required");
  }

  const user = await Users.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(400, "user does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessRefreshToken(
    user._id
  );
  const loggedInUser = await Users.findById(user._id).select(
    "-password -refreshToken"
  );

  const option = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user loggedIn sccessfully..."
      )
    );
});

const logOutUser = asynHandle(async (req, res) => {
  await Users.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const option = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new ApiResponse(200, {}, "User logged-out successfully..."));
});

const refreshAccessToken = asynHandle(async (req, res) => {
  const inComingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!inComingRefreshToken) {
    new ApiError(401, "Unauthorized request...");
  }
  try {
    const decodedToken = jwt.verify(
      inComingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = Users.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refreshToken...");
    }

    if (inComingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token is expired or used!!!");
    }

    const option = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newrefreshToken } = await generateAccessRefreshToken(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, option)
      .cookie("refreshToken", newrefreshToken, option)
      .json(
        new ApiResponse(
          200,
          { accessToken, newrefreshToken },
          "access token refresh successfully..."
        )
      );
  } catch (error) {
    throw new ApiError(401, "invalid refreshToken");
  }
});

const changeCurrentPassword = asynHandle(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = Users.findById(req.user?._id);
  const isPass = await user.isPasswordCorrect(oldPassword);
  if (!isPass) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: flase });

  return res.status(200).json(new ApiResponse(200, "Password successfully..."));
});

const getCurrentUser = asynHandle(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "current user fetched successfully");
});

const updateAccoutDetails = asynHandle(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "all fields are required!!!");
  }

  const user = await Users.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName, // fullName: fullName
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, "Account deatils updated successfully...")
    );
});

const updateUserAvatar = asynHandle(async (req, res) => {
  const avatarLocalFile = req.file?.path;
  if (!avatarLocalFile) {
    throw new ApiError(400, "Avatar file is missing...");
  }

  const avatar = await uploadOnCloudinary(avatarLocalFile);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await Users.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully..."));
});

const updateUserCoverImage = asynHandle(async (req, res) => {
  const coverLocalFile = req.file?.path;
  if (!coverLocalFile) {
    throw new ApiError(400, "coverImage file is missing...");
  }

  const coverImage = await uploadOnCloudinary(coverLocalFile);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on coverImage");
  }

  const user = await Users.findById(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage updated successfully..."));
});

const getUserChannelProfile = asynHandle(async (req, res) => {
  const { username } = req.params;

  // Check if username is provided
  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  try {
    const channel = await Users.aggregate([
      {
        $match: {
          username: username.toLowerCase(),
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo",
        },
      },
      {
        $addFields: {
          subscribersCount: {
            $size: "$subscribers",
          },
          channelSubscribedTCount: {
            $size: "$subscribedTo",
          },
          isSubscribed: {
            $cond: {
              if: { $in: [req.user?._id, "$subscribers.subscriber"] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          fullName: 1,
          username: 1,
          subscribersCount: 1,
          channelSubscribedTCount: 1,
          avatar: 1,
          coverImage: 1,
          email: 1,
          isSubscribed: 1, // Include isSubscribed in the projection
        },
      },
    ]);

    // Handle case where no channel is found
    if (!channel || channel.length === 0) {
      throw new ApiError(404, "Channel not found");
    }

    // Send the found channel profile as the response
    return res
      .status(200)
      .json(
        new ApiResponse(200, channel[0], "User channel fetched Successfully...")
      );
  } catch (error) {
    // Handle potential errors
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

const getWatchHistory = asynHandle(async (req, res) => {
  const user = await Users.aggregate([
    // aggregration data will go directly so we have chage usefull form before...
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "Videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            // data improvement...
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(200, user[0].watchHistory),
      "watch History fetched succesfully...."
    );
});

export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccoutDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
