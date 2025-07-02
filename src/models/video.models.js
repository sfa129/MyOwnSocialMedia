import mongoose, { Schema } from 'mongoose';

const videoSchema = new mongoose.Schema(
    {
        
    },
    {
        timestamps: true
    }
);

export const Video = mongoose.model("Video", videoSchema);