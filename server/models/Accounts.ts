import mongoose  from "mongoose";
import { platform } from "node:os";

const accountSchema = new mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    platform: {type: String, enum: ["twitter", "linkedin", "facebook", "instagram", "facebook_page", "instagram_business"], required: true}, 
    handle:{type: String, required: true},
    zernioAccountId: {tpye: String},
    accessToken: {type: String},  
    refreshToken: {type: String},  
    tokenExpiresAt: {type:Date}, 
    status: {type: String, enum: ["connected", "disconnected"], default: "connected"}, 
    avatarURL: {type:String}, 
}, {timestamps:true})

export const Account = mongoose.model("Account", accountSchema)