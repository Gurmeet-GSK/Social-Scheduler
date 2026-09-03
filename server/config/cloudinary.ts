import {v2 as cloudinary} from 'cloudinary'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

// add temporarily at the top of config/cloudinary.ts, right after cloudinary.config(...)
console.log("Cloudinary config check:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? "set" : "MISSING",
  api_secret: process.env.CLOUDINARY_API_SECRET ? "set" : "MISSING",
});

export {cloudinary};
