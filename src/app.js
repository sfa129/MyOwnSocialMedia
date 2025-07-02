import express, { urlencoded } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

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


export { app }