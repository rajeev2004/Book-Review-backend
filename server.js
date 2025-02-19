import express from "express"
import dotenv from "dotenv"
import cors from "cors";
import router from "./routes/router.js";
const app=express();
dotenv.config();
app.use(express.json());
app.use(cors());
app.use(router);
const PORT=process.env.PORT || 5000;
app.listen(PORT,()=>{
    console.log(`server is running on port ${PORT}`)
})