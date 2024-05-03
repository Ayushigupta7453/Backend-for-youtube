import {asyncHandler} from "../utils/asyncHandler";
import {ApiError} from "../utils/ApiError"; 
import { uploadoncloudinary } from "../utils/cloudinary";
import { User } from "../models/user.models";
import { ApiResponse } from "../utils/ApiResponse";
import { jwt } from "jsonwebtoken";

//method to generate access and refresh token both. this method is created so that we can use this again and again

const generateAccessandRefreshToken = async(userId)=>{
    try{
     const user = await User.findById(userId)
     const accessToken = user.generateAccessToken()
     const refreshToken = user.generateRefreshToken()
     user.refreshtoken = refreshToken
     await user.save({validateBeforeSave:false})

     return {accessToken,refreshToken}
    }
    catch(error){
        throw new ApiError(500,"something went wrong while generating refrsh and access token")
    }
}

const registerUser = asyncHandler(async(req,res)=>{
    // res.status(200).json({
    //     message:"ok"
    // })
    //get user  details
    const {fullname,email,username,password}=req.body
    console.log("email",email)

    //validate user details
    if(
        [fullname,email,username,password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400,"fullname required")
    }


    //check if user already exists or not
   const existedUser= User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"user with email or username already exist")
    }


    //check for img or avatar
    const avatarlocalpath = req.files?.avatar[0]?.path
    let coverimagelocalpath
    if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
            coverimagelocalpath= req.files.coverImage[0].path
    }
    if(!avatarlocalpath){
        throw new ApiError(400,"avatar file is required")
    }

    //upload them to cloudinary
    const avatar = await uploadoncloudinary(avatarlocalpath)
    const coverImage = await uploadoncloudinary(coverimagelocalpath)

    //if there is no avatar in db then give error
    if(!avatar){
       throw new ApiError(400,"avatar file is required") 
    }
    User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url||"",
        email,
        password,
        username:username.toLowerCase()
    })
    // if user is not found in db then create new
   const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
   )
   if(!createdUser){
    throw new ApiError(500,"something went wrong while registering the user")
   }

   //return response
   return res.status(201).json(
    new ApiResponse(200,createdUser,"USER registered successfully")
   )
})


const loginUser = asyncHandler(async(req,res)=>{
    //req body->data
    const {email,username,password}=req.body
    if(!(username || email)){
       throw new ApiError(400,"username or email is required")
    }
    
    //username or email find user
    const user = await User.findOne({
        $or:[{username},{email}]   // this or operator chooses one or more options to find user to find
    })
    if(!user){
        throw new ApiError(404,"user not exist")
    }

    //check for password
    const ispasswordvalid = await user.isPasswordCorrect(password)
    
    if(!ispasswordvalid){
        throw new ApiError(401,"user password in wrong")
    }

    //generate access and refresh token
    //using their function made above
   const {accessToken,refreshToken}=await generateAccessandRefreshToken(user._id)

   const logedInUser = await User.findById(user._id).
   select("-password -refreshToken") //this select is used to not see these options

   const options = {              //this object is related to configuring cookies 
    httpOnly : true,              //cookie is only accessibke through http requests and prevents client side scripts from accessing cookie
    secure:true
   }
   return res.status(200).cookie("accessToken", accessToken,options).cookie("refreshToken",refreshToken,options).json(
    new ApiResponse(
        200,
        {
            user:logedInUser,accessToken,refreshToken
        },
        "user logged in successfully"
    )
   )
})

//how to logout
const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,{
            $set:{
                refreshToken:undefined
            }    
        },
        {
            new: true
        } 
    )
    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).json(new ApiResponse(200,{},"User logout successfully"))
})

//how to refresh 
const refreshAccessToken = asyncHandler(async(req,res)=>{
   try{
    req.cookies.refreshToken || req.body.refreshToken

    if(incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }
const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    )
    const user = await User.findbyId(decodedToken?._id)

    if(!user){
        throw new ApiError(401,"invalid refresh token")
    }

    if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401,"refresh token is expired or used")
    }

    const options = {
        httpOnly:true,
        secure:true
    }
    const {accessToken,newRefreshToken} = await generateAccessandRefreshToken(user._id)
    return res.status(200).cookie("accessToken",accessToken,options).cookie("newRefreshToken",newRefreshToken,options).json(
        new ApiResponse(
            200,
           {accessToken,refreshToken:newRefreshToken},
           "access token refreshed"
        )
    )
   }
   catch(error){
    throw new ApiError(401,error?.message||"invalid refreshtoken")
   }
})


const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldpassword,newpassword,} = req.body
    const user = await User.findById(req.user?.id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldpassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"invalid old password")
    }
    user.password = newpassword
    await user.save({validateBeforeSave:false})

    return res.status(200).json(new ApiResponse(200,{},"Password changed succesfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(200,req.user,"current user fetched succesfully")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullname,email}=req.body

    if(!(fullname||email)){
        throw new ApiError(400,"all fields are required")
    }

    const user = User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullname,
                email
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200,user,"account details updated successfully"))
})


const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarlocalpath= req.file?.path

    if(!avatarlocalpath){
        throw new ApiError(400,"avatar file is changed")
    }
    const avatar = await uploadoncloudinary(avatarlocalpath)

    if(!avatar.url){
        throw new ApiError(400,"ERROR while uploading")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")
})

const updateCoverImage = asyncHandler(async(req,res)=>{
    const coverimagelocalpath= req.file?.path

    if(!coverimagelocalpath){
        throw new ApiError(400,"cover img file is changed")
    }
    const coverImage = await uploadoncloudinary(coverimagelocalpath)

    if(!coverImage.url){
        throw new ApiError(400,"ERROR while uploading cover img")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverimg:coverImage.url
            }
        },
        {new:true}
    ).select("-password")
    return res.status(200).json(new ApiResponse(200,user,"cover img updated"))
})

const getUserChannelprofile = asyncHandler(async(req,res)=>{
   const {username}=req.params
   if(!username?.trim()){
    throw new ApiError(400,"username is missing")
   }
    const channel=await User.aggregate([
    {
        $match:{
            username:username?.toLowerCase()
        }
    },{
        $lookup:{
            from:"Subscription",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
        }
    },{
        $lookup:{
            from:"Subscription",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
        }
    },
    {
        $addFields:{
            subscribersCount:{
                $size:"$subscribers"
            },
            chanelsSubscribedtoCount:{
                $size:"$subscribedTo"
            },
            isSubscribed:{
                $cond:{
                    if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                    then:true,
                    else:false
                }
            }
        }
    },
    {
        $project:{
            fullname:1,
            username:1,
            subscribersCount:1,
            chanelsSubscribedtoCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1
        }
    }
    ])
    if(!channel?.length){
        throw new ApiError(404,"channel not exist")
    }
    return res.status(200).json(new ApiResponse(200,channel[0],"user channel fetched successfully"))
   
})

const getWatchHistory = asyncHandler(async(req,res)=>{
  const user = await User.aggregate([
    {
        $match:{
            _id:new mongoose.Types.ObjectId(req.user._id)
        }
    },
    {
        $lookup:{
            from:"videos",
            localField:"watchHistory",
            foreignField:"_id",
            as:"watchHistory",
            pipeline:[
                {
                    $lookup:{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[
                            {
                                $project:{
                                    fullname:1,
                                    username:1,
                                    avatar:1
                                }
                            }
                        ]
                    }
                },
                {
                   $addFields:{
                    owner:{
                        $first:"$owner"
                    }
                   } 
                }
            ]
        }
    }
  ])

  return res.status(200).json(new ApiResponse(200,user[0].WatchHistory,"watch history fetched successfully"))
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateCoverImage,
    getUserChannelprofile,
    getWatchHistory
}