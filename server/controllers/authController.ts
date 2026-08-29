// Register User

import { Request } from "express"
import { User } from "../models/User.js";

// POST /api/auth/register

export const registerUser = async (req: Request, res: Response): Promise<void> => {
    try{
        const {name, email, password} = req.body;
        const userExist = await User.findOne({email})
        if(userExist) {
            res.status(400).json({message: "User with this Email is already exists"})
            return; 
        } 
    } catch (error) {

    }
}