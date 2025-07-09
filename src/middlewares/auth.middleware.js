import { User } from '../models/user.models.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
// import { jwt } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';


//check whether loggedIn or not
export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        //get token from cookies (request) or from header 
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer", "");
    
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }
    
        //decode the jwt - for decoding, secret are required
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
        if (!user) {
            throw new ApiError(401, "Inavlid Access Token") //if token is wrong
        }
    
        // pass the object named "user" into req and give the access of user
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})