import connectDB from "./db/index.js";
import dotenv from 'dotenv';
import { app } from "./app.js";

dotenv.config(
    {
        path:'./env'
    }
)

//When async / await method completes, it provides a promise, so we will use .then, .catch after calling the connectDB();
connectDB()
.then( () => {
    app.on("Error", (error) => {
        console.log("Error Found: ", error)
    })

    app.listen(process.env.PORT || 8000, () => {
        console.log(`server is running at port: ${process.env.PORT}`)
    })
} )
.catch( (err) => {
    console.error("MongoDB Connection Failed: ", err)
} )















// First approach to connect DB
/* import mongoose from "mongoose";
import { DB_NAME } from "./constants";

import express from 'express';
const app = express();

( async () => {
   try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

    app.on(error, (error) => {
        console.error("error", error);
        throw error
    })

    app.listen(process.env.PORT, () => {
        console.log(`App is listening at ${process.env.PORT}`)
    })

   } catch (error) {    
    console.error("Error: ", error)
    throw err;
   } 
} )(); */