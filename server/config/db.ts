import mongoose from "mongoose";

const connectDB = async () => {
    try {
        mongoose.connection.on("connected", () => {
            console.log("MongoDb Connected")
        });
        await mongoose.connect(process.env.MONGODB_URI!)
    } catch (error: any) {
        console.error(error)
        process.exit(1)
    }
}

export default connectDB;