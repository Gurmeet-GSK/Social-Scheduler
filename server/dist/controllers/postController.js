import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { cloudinary } from "../config/cloudinary.js";
import { Generation } from "../models/Generation.js";
import { Post } from "../models/Post.js";
//Helper to poll leonardo.ai
const pollLeonardoJob = async (generationId, apiKey) => {
    const maxRetries = 10;
    const delay = 5000;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await axios.get(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
                headers: {
                    accept: "application/json", authorization: `Bearer ${apiKey}`
                }
            });
            const generation = response.data.generation_by_pk;
            if (generation.status === "COMPLETE") {
                if (generation.generated_images && generation.generated_images.length > 0) {
                    return generation.generated_images[0].url;
                }
                throw new Error("Generation complete but no  images found.");
            }
            if (generation.status === "FAILED") {
                throw new Error("Leonardo.ai generation failed.");
            }
        }
        catch (err) {
            console.error("Polling error: ", err?.response?.data || err.message);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
    throw new Error("Leonardo.ai generation timed out.");
};
//Generate Post
//POST /api/posts/generate
export const generatePost = async (req, res) => {
    try {
        const { prompt, tone, generateImage } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            res.status(400).json({ message: "Gemini API key is missing. Please add it to your server/ .env file." });
            return;
        }
        const ai = new GoogleGenAI({ apiKey });
        //GENERATE TEXT
        const textResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a social media post based on this prompt: "${prompt}".
            Tone: ${tone}. 
            Inculde relevant hashtages.
            Format the response as JSON with "content" and "imagePrompt" fields.
            The "imagePrompt" should be a highly descriptive prompt for an image generation that complements the post.`,
        });
        let content = "";
        let imagePrompt = prompt;
        try {
            const rawText = textResponse.text || "";
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { content: rawText, imagePrompt: prompt };
            content = data.content;
            imagePrompt = data.imagePrompt;
        }
        catch (e) {
            content = textResponse.text || "";
        }
        let mediaUrl = "";
        if (generateImage) {
            try {
                const leonardoKey = process.env.LEONARDO_API_KEY;
                if (leonardoKey) {
                    //Use leonardo.ai for image generation
                    const leoResponse = await axios.post("https://cloud.leonardo.ai/api/rest/v2/generations", {
                        "public": false,
                        "model": "gpt-image-2",
                        "parameters": {
                            "quality": "LOW",
                            "prompt": imagePrompt,
                            "quantity": 1,
                            "width": 1024,
                            "height": 1024,
                            "prompt_enhance": "OFF",
                        }
                    }, {
                        headers: {
                            accept: "application/json",
                            authorization: `Bearer ${leonardoKey}`,
                            "content-Type": "application/json",
                        }
                    });
                    const generationId = leoResponse.data.generate.generationId;
                    const tempUrl = await pollLeonardoJob(generationId, leonardoKey);
                    //upload to cloudinary for persistence
                    const uploadResult = await cloudinary.uploader.upload(tempUrl, {
                        folder: "ai-generations",
                    });
                    mediaUrl = uploadResult.secure_url;
                }
            }
            catch (err) {
                console.error("Image generation failed: ", err);
            }
        }
        // Save generation to DB
        const generation = await Generation.create({
            user: req.user._id,
            prompt,
            content,
            mediaUrl,
            mediaType: mediaUrl ? "image" : undefined,
            tone
        });
        res.json(generation);
    }
    catch (error) {
        res.status(500).json({ message: error?.message || "Server Error" });
    }
};
// Get generations
//GET /api/posts/generations
export const getGenerations = async (req, res) => {
    try {
        const generations = await Generation.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(generations);
    }
    catch (error) {
        res.status(500).json({ message: error?.message || "Server Error" });
    }
};
// Get Posts
//GET /api/posts
export const getPosts = async (req, res) => {
    try {
        const posts = await Post.find({ user: req.user._id });
        res.json(posts);
    }
    catch (error) {
        res.status(500).json({ message: error?.message || "Server Error" });
    }
};
// Scheduled Posts
//POST /api/posts
export const scheduletPosts = async (req, res) => {
    try {
        const { content, scheduledFor, status } = req.body;
        const rawPlatforms = req.body.platform ?? req.body.platforms ?? [];
        const validPlatforms = ["twitter", "facebook", "linkedin", "instagram"];
        let parsedPlatforms = [];
        if (Array.isArray(rawPlatforms)) {
            parsedPlatforms = rawPlatforms
                .map((value) => String(value).trim().replace(/[\[\]\"']/g, ""))
                .filter((value) => Boolean(value))
                .filter((value) => validPlatforms.includes(value));
        }
        else if (typeof rawPlatforms === "string") {
            try {
                const candidate = JSON.parse(rawPlatforms.replace(/\\/g, ""));
                const source = Array.isArray(candidate) ? candidate : candidate.split(",");
                parsedPlatforms = source
                    .map((value) => String(value).trim().replace(/[\[\]\"']/g, ""))
                    .filter((value) => Boolean(value))
                    .filter((value) => validPlatforms.includes(value));
            }
            catch {
                parsedPlatforms = String(rawPlatforms)
                    .split(",")
                    .map((value) => String(value).trim().replace(/[\[\]\"']/g, ""))
                    .filter((value) => Boolean(value))
                    .filter((value) => validPlatforms.includes(value));
            }
        }
        if (!content || !scheduledFor || parsedPlatforms.length === 0) {
            res.status(400).json({ message: "Content, scheduled time, and at least one platform are required." });
            return;
        }
        const parsedDate = new Date(scheduledFor);
        if (Number.isNaN(parsedDate.getTime())) {
            res.status(400).json({ message: "Invalid scheduled date/time." });
            return;
        }
        let mediaUrl = req.body.mediaUrl;
        let mediaType = req.body.mediaType;
        if (req.file) {
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream({ resource_type: "auto", folder: "social-scheduler" }, (error, result) => {
                    if (error)
                        reject(error);
                    else
                        resolve(result);
                });
                stream.end(req.file.buffer);
            });
            mediaUrl = result.secure_url;
            mediaType = result.resource_type === "video" ? "video" : "image";
        }
        const post = await Post.create({
            user: req.user._id,
            content,
            platform: parsedPlatforms,
            mediaUrl,
            mediaType,
            scheduledFor: parsedDate,
            status,
        });
        res.status(201).json(post);
    }
    catch (error) {
        res.status(500).json({ message: error?.message || "Server Error" });
    }
};
