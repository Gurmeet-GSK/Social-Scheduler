import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware.js";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { cloudinary } from "../config/cloudinary.js";
import { Generation } from "../models/Generation.js";
import { Post } from "../models/Post.js";
import { InferenceClient } from "@huggingface/inference";

//Generate Post
//POST /api/posts/generate
export const generatePost = async (req: AuthRequest, res: Response): Promise<void> => {
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
        } catch (e) {
            content = textResponse.text || ""
        }

        let mediaUrl = "";
        if (generateImage) {
            const hfKey = process.env.HF_API_KEY;
            if (!hfKey) {
                console.error("HF_API_KEY is missing from process.env — check your .env file and restart the server.");
            } else {
                try {
                    const hf = new InferenceClient(hfKey);

                    const result: any = await hf.textToImage({
                        model: "black-forest-labs/FLUX.1-schnell",
                        inputs: imagePrompt,
                        provider: "auto",
                    });

                    let uploadSource: string;
                    if (typeof result === "string") {
                        // SDK returned a URL or a base64 data URI directly — Cloudinary can ingest either as-is
                        uploadSource = result;
                    } else {
                        // SDK returned a Blob — convert it to a base64 data URI for Cloudinary
                        const arrayBuffer = await (result as Blob).arrayBuffer();
                        const base64Image = Buffer.from(arrayBuffer).toString("base64");
                        uploadSource = `data:image/png;base64,${base64Image}`;
                    }

                    const uploadResult = await cloudinary.uploader.upload(uploadSource, {
                        folder: "ai-generations",
                    });
                    mediaUrl = uploadResult.secure_url;
                    console.log("Image generated and uploaded:", mediaUrl);
                } catch (err: any) {
                    console.error("Image generation failed:", err?.message || err);
                }
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
        })
        res.json(generation)
    } catch (error: any) {
        res.status(500).json({ message: error?.message || "Server Error" });
    }
}

// Get generations
//GET /api/posts/generations
export const getGenerations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const generations = await Generation.find({ user: req.user._id }).sort({ createdAt: -1 })
        res.json(generations);

    } catch (error: any) {
        res.status(500).json({ message: error?.message || "Server Error" });
    }
}

// Get Posts
//GET /api/posts
export const getPosts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const posts = await Post.find({ user: req.user._id })
        res.json(posts);
    } catch (error: any) {
        res.status(500).json({ message: error?.message || "Server Error" });
    }
}

// Scheduled Posts
//POST /api/posts
export const schedulePost = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { content, platforms, scheduledFor, status } = req.body;

        //Parse platforms if it comes as a stringified array from FormData
        let parsedPlatforms = platforms;
        if (typeof platforms === "string") {
            try {
                parsedPlatforms = JSON.parse(platforms)
            } catch (e) {
                parsedPlatforms = platforms.split(",");
            }
        }

        if (!content || !scheduledFor || !parsedPlatforms?.length) {
            res.status(400).json({ message: "Content, platforms, and scheduled time are required" });
            return;
        }

        let mediaUrl: string | undefined = req.body.mediaUrl;
        let mediaType: "image" | "video" | undefined = req.body.mediaType;

        if (req.file) {
            try {
                const result = await new Promise<any>((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { resource_type: "auto", folder: "social-scheduler" },
                        (error, result) => (error ? reject(error) : resolve(result))
                    );
                    stream.end(req.file!.buffer);
                });
                mediaUrl = result.secure_url;
                mediaType = result.resource_type === "video" ? "video" : "image";
            } catch (err: any) {
                console.error("Cloudinary upload failed:", err?.message || err);
                res.status(502).json({ message: `Media upload failed: ${err?.message || "unknown error"}` });
                return;
            }
        }

        const post = await Post.create({
            user: req.user._id,
            content,
            platforms: parsedPlatforms,
            mediaUrl,
            mediaType,
            scheduledFor,
            status,
        })
        res.status(201).json(post);
    } catch (error: any) {
        res.status(500).json({ message: error?.message || "Server Error" });
    }
}



