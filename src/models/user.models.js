import mongoose, {Schema} from 'mongoose';
import bcrypt from 'bcrypt';


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
        fullName: {
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

//inject the middleware into Schema i.e. "pre"
//use this middleware to perform something before user request
//here we are going to bcrypt the password before saving user's data
userSchema.pre("save", async function(next){
    //this is negative, it means that password bcrypt when password change
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
})

//inect the method into Schema i.e. "isPasswordCorrect"
//check password correct or not by comparing - use compare method of bcrypt
userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password) //return true or false
}

//going to make the token and inject in jwt through "sign" method of jwt
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
       { 
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }

    ) 
}

//refresh token have few info than access token because it refresh many times
userSchema.methods.generateRefreshToken = function () {
return jwt.sign(
       { 
        _id: this._id
    },
    process.env.ACCESS_REFRESH_SECRET,
    {
        expiresIn: process.env.ACCESS_REFRESH_EXPIRY
    }

    ) 
}


export const User = mongoose.model("User", userSchema);