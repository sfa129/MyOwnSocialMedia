import mongoose, {Schema} from 'mongoose';

const userSchema = new mongoonse.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true //make this field searchable in DBs - (heavy)
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullname: {
            type: String,
            required: true,
            trim: true,
            index: true 
        },
        avatar: {
            type: String, //cloudinary url - (used to store images like cloud)
            required: true 
        },
        coverImage: {
            type: String //cloudinary url
        },
        watchHistory: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Video"
            },
        ],
        password: {
            type: String, //this is challenge because we store password in string for comparison
            required: [true, "Password is required"]
        },
        refreshToken: {
            type: String
        }
    }, 
    {
        timestamps: true
    }
);

export const User = mongoose.model("User", userSchema);