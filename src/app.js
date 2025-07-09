import express, { urlencoded } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import {upload} from './middlewares/multer.middleware.js'

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

//for form submission
app.use(express.json({ limit:"16kb" }));

//for url - extended allow to use nested objects
app.use(express.urlencoded({extended: true, limit: "16kb"}));

//make public folder - use to save pdf file or image or etc in public folder
app.use(express.static("public"));

//cookieParser allow me to set and access cookies at user's browser from server
app.use(cookieParser());


//routes import 
import userRouter from './routes/user.routes.js';

//routes declaration
app.use('/api/v1/users',
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    userRouter)


export { app }