import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    
    const pipeline = [];

    //for full text based search, you need to create Search Index in db
    if(query) { 
        pipeline.push(
            {
                $search: {
                    index:"search-videos",
                    text: {
                        query: query,
                        path: ["title", "description"]
                    }
                }
            }
        )
    };

    if(userId) {
        if(!isValidObjectId(userId)) {
            throw new ApiError("Invalid UserId")
        }
    };

    pipeline.push(
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        }
    );

    pipeline.push(
        {
            $match: {
                isPublished: true
            }
        }
    );

    if(sortBy && sortType) {
        pipeline.push(
        {
            $sort: {
                [sortBy]: sortType === 'asc' ? 1 : -1
            }
        }
    )
    } else {
        pipeline.push(
            {
                $sort: {
                    createdAt: -1
                }
            }
        )
    };

    pipeline.push(
        {
            $lookup: {
                
            }
        }
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}