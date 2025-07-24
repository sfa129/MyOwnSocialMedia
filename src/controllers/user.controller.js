import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/user.models.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken"
import mongoose from 'mongoose';

//method to generate tokens
const generateAccessAndRefreshTokens = async (userId) => {
    const user = await User.findById(userId); //find user in db by id
    const accessToken = user.generateAccessToken(); //generate access token
    const refreshToken = user.generateRefreshToken(); // generate refresh token

    user.refreshToken = refreshToken;  //save token into db
    await user.save({ validateBeforeSave: false }); //avoid the validation 

    return { accessToken, refreshToken }

}

const registerUser = asyncHandler(async (req, res) => {
    //get user details
    const { fullName, email, username, password } = req.body
    // console.log("email", email)

    //validate user details
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    //check user already exist or not
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with Email or Password already exists")
    }

    //check for images / check for avatar, it means that it upload by user or not
    //middleware also give us "file" access in req 
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path; //if you not provide coverImage, it gives an error

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar File is required")
    }

    //upload avatar / coverImage on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar File is required")
    }

    //create user
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //we are doing two here 
    //first is we are going to check, user is created or not
    //second is minus the password and refresh token because we dont want to send in response 
    const createdUser = await User.findById(user._id).select(  //_id add against every entry in db
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user!")
    }

    //return the response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully!")
    )
});

const loginUser = asyncHandler(async (req, res) => {

    //first we get user data 
    const { username, email, password } = req.body;

    if (!email && !username) {
        throw new ApiError(400, "username or password is required")
    };

    //check user exist or not of this username or password
    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        throw new ApiError(404, "User does not exist")
    };
    //check Is password correct or not?
    // const password = String(req.body.password || "").trim();

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    };

    //taken tokens from above method (we make) i.e.generateAccessAndRefreshTokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    //taken user data from db except password and refresh token
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    //make cookie secure - by default cookies are modifiable by 
    //frontend but after these options it can be done by server only
    const options = {
        httpOnly: true,
        secure: true
    }

    //return the response
    return res
        .status(200)
        .cookie("refreshToken", refreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken //not good practice but it enable the user to save these on frontend    
                },
                "User logged in successfully    "
            )
        )
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1, // it will removes the field from document
            }
        },
        {
            new: true
        }
    );

    //take options here
    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("refreshToken", options)
        .clearCookie("accessToken", options)
        .json(new ApiResponse(200, {}, "user logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    //take refresh token from user
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    }

    try {
        //decode the refresh token
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        //take stored refresh token
        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        //match the both tokens
        if (decodedToken === user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used")
        }

        //generate the tokens by method "generateAccessAndRefreshTokens";
        const options = {
            httpOnly: true,
            secure: true
        };

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        //return the response
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToekn", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, newRefreshToken: refreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }



})

const changePassword = asyncHandler(async (req, res) => {
    //take old and new password from req.body
    const { oldPassword, newPassword } = req.body;

    //check oldPassword is correct or not
    const isPasswordCorrect = await isPasswordCorrect(oldPassword); //return true or false

    if (!isPasswordCorrect) {
        throw new ApiError(401, "oldpassword is incorrect");
    };

    //make db call to collect user data || here "user" is the object which is injected by us in middleware
    const user = await User.findById(req.user?._id);

    //set new password
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    //send response
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "current user fetched successfully")
        )
})

//update the text data
const updateAccountDetails = asyncHandler(async (req, res) => {
    //take user details from req.body
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(401, "All fields are required");
    }

    //make db call and update the details
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    //take new avatar from user || take path from middlware not directly from user
    const avatarLocalPath = req.file?.path //use "file" because we update only single file

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar File not found")
    };

    //upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading Avatar on Cloudinary")
    }

    //update the avatar url in db so make sb call for user data
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url //here only updates the url not the whole object
            }
        },
        { new: true }
    ).select("-passwor");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Avatar uploaded successfully"

            ))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "coverImage file not found");
    };

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (coverImage.url) {
        throw new ApiError(400, "Error while coverImage uploading on Cloudinary");
    };

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password");

    res
        .status(200)
        .json(
            new ApiResponse(200, user, "Cover Image updated successfully"
            ))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "username not found")
    };

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.lowercase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                    then: true,
                    else: false
                },

                $project: {
                    fullName: 1,
                    username: 1,
                    subscribersCount: 1,
                    channelsSubscribedToCount: 1,
                    isSubscribed: 1,
                    avatar: 1,
                    coverImage: 1,
                    email: 1
                }

            }
        }
    ]);

    if (!channel?.length) {
        throw new ApiError(401, "Channel does not exist")
    };

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "User channel fetched successfully!"))
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos", //saved as plural with first letter conversion into lowercase
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
                                        username: 1,
                                        fullName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "watch history fetched successfully!"))
});


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};