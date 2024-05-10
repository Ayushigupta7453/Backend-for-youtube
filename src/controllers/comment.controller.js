import mongoose,{Schema} from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";
import {ApiError} from "../utils/ApiError.js";
import { Comment } from "../models/comment.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const getVideoComments = asyncHandler(async(req,res)=>{
    //get all comments for a video
    const {videoId}=req.params
    const {page=1,limit=10} = req.query
    const comments= await Comment.find({videoId}).skip((page - 1) * limit).limit(parseInt(limit))

    if(!comments){
        throw new ApiError(500,"comments can't be fetched")
    }
    return res.status(200).json(new ApiResponse(200,{comments},"comments fetched successfully"))
})

const addComment = asyncHandler(async (req, res) => {
    
    const {content,video,owner}=req.body
    try {
        // Create a new comment object
        const newComment = new Comment({
            content,
            owner,
            video,
            // You can add more fields like timestamps or any other relevant information here
        });

        // Save the new comment to the database
        await newComment.save();

        // Send a success response
        return res.status(201).json(
            new ApiResponse(200,{newComment},"comments added successfully")
        );
    } catch (error) {
        // If there's an error, send an error response
        throw new ApiError(500,"comments cant be added")
    }

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {video,content}=req.body

    if(!(video||content)){
        throw new ApiError(400,"all fields are required")
    }

    const comment = Comment.findOneAndUpdate(req.video?._id,
        {
            $set:{
               content
            }
        },
        {new:true}
    )
   if(!comment){
    throw new ApiError(500,"comments could not be updated")
   }
    return res.status(200).json(new ApiResponse(200,comment,"comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;
    const deletecomment = await Comment.findByIdAndDelete(commentId)

    if(!deletecomment){
        throw new ApiError(404,"comment not found to delete")
    }
    return res.status(200).json(new ApiResponse(200,deletecomment,"comment deleted successfully"))

})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}