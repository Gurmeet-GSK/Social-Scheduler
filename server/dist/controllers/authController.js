import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || "fallback_secret", {
        expiresIn: "30d",
    });
};
// Register User
// POST /api/auth/register
export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body ?? {};
        if (!name || !email || !password) {
            res.status(400).json({ message: "Name, email, and password are required" });
            return;
        }
        const userExist = await User.findOne({ email });
        if (userExist) {
            res.status(400).json({ message: "User with this Email already exists" });
            return;
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await User.create({ name, email, password: hashedPassword });
        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(String(user._id)),
            });
            return;
        }
        res.status(400).json({ message: "Invalid user data" });
        return;
    }
    catch (error) {
        res.status(500).json({ message: error?.message || "Server Error" });
    }
};
// Login User
// POST /api/auth/login
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body ?? {};
        if (!email || !password) {
            res.status(400).json({ message: "Email and password are required" });
            return;
        }
        const user = await User.findOne({ email });
        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(String(user._id)),
            });
            return;
        }
        res.status(401).json({ message: "Invalid email or password" });
        return;
    }
    catch (error) {
        res.status(500).json({ message: error?.message || "Server Error" });
    }
};
