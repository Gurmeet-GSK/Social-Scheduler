import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.warn("MONGODB_URI is not set. Starting server without MongoDB connection.");
    return;
  }

  try {
    mongoose.connection.on("connected", () => {
      console.log("MongoDB Connected");
    });

    mongoose.connection.on("error", (error) => {
      console.error("MongoDB connection error:", error);
    });

    await mongoose.connect(mongoUri);
  } catch (error: any) {
    console.error("MongoDB connection failed:", error?.message || error);
  }
};

export default connectDB;