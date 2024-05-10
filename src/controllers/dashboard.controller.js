import mongoose from "mongoose";
import {Video} from "../models/videos.models.js"
import {Subscription} from "../models/subscription.models.js"
import {Like} from "../models/like.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
   try{
    const channelId = req.params.channel;
    const totalVideoViews = await Video.aggregate([
        {
            $match: { channel: channelId }
        },
        {
            $group: {
                _id: null,
                totalViews: { $sum: "$views" }
            }
        }
    ]);
    const totalSubscribers = await Subscription.countDocuments({ channel: channelId });
    const totalVideos = await Video.countDocuments({ channel: channelId });
    const totalLikes = await Like.countDocuments({ channel: channelId });
    return res.status(200).json(new ApiResponse(200,{totalVideoViews: totalVideoViews[0] ? totalVideoViews[0].totalViews : 0,
        totalSubscribers,
        totalVideos,
        totalLikes},"successfully done"))
   }
  catch (error) {
            // If there's an error, send an error response
            throw new ApiError(500,"could not perform actions on video cant be added")
        }
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const channelId = req.params.channel

    const videos = await Video.find({channel:channelId}).sort({ispublished:-1})
    return res.status(200).json(new ApiResponse(200,{videos},"all videos uploaded successfully"))
})

export {
    getChannelStats, 
    getChannelVideos
    }