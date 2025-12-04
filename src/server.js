import dotenv from "dotenv";
import connectDB from "./db/connection.js";
import { app } from "./app.js";

dotenv.config({
    path:"./.env"
})



connectDB()
.then(()=> {
    app.on("error",(err) =>{
        console.log("ERROR:", err)
        throw err
    });
    app.listen(process.env.PORT||8000,() =>{
        console.log(`server is running at port : ${process.env.PORT} `);
    })
}).catch((error) => {
    console.log("Mongo_DB Connection Failed!!!",error)
})