import {v2 as cloudinary} from 'cloudinary';
import fs from fs;
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key:  process.env.CLOUDINARY_API_KEY, 
    api_secret:  process.env.CLOUDINARY_API_SECRET, 
  });
  
const uploadoncloudinary = async (localfilepath)=>{
    try{
       if(!localfilepath) return null
       //upload file on cloudinary
       const response = await cloudinary.uploader.upload(localfilepath,{
        resource_type:"auto"
       })
       //file uploaded succesfully
       console.log("file is uploaded on cloudinary",response.url)
       return response
    }catch(error){
        fs.unlinkSync(localfilepath)//remove local save file as upload operaton gets failed
    return null;
    }
}
  
export {uploadoncloudinary}
