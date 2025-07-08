import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/user.models.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async (req, res) => {
    //get user details
    const { fullName, email, username, password } = req.body
    // console.log("email", email)

    //validate user details
    if ([fullName, email, username, password].some((field) => field?.trim() === "" )) {
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

    if(!avatar) {
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

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user!")
    }

    //return the response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully!")
    )
});

export { registerUser };