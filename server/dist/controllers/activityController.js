// GET ALL ACTIVITY
import { ActivityLog } from "../models/ActivityLog.js";
//GET /api/activity
export const getActivity = async (req, res) => {
    try {
        const activity = await ActivityLog.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(10).populate("relatedPost", "content");
        res.json(activity);
    }
    catch (error) {
        res.status(500).json({ message: error?.message || "Server Error" });
    }
};
