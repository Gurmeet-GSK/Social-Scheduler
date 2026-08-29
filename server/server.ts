import "dotenv/config";
import express, { NextFunction, Request, Response } from 'express';
import cors from "cors";
import connectDB from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import socialAuthRouter from "./routes/socialAuthRoutes.js";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors())
app.use(express.json());


// Routes
app.get('/', (_req: Request, res: Response) => {
    res.send('Server is Live!');
});

app.use("/api/auth", authRouter)
app.use("/api/oauth", socialAuthRouter)

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction)=> {
    console.error(err);
    res.status(500).send(err?.response?.data?.message || err?.message)
})


// Connect DB then start server
await connectDB().then(() => {
    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`)
    })
})
