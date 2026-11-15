import express from "express";
import router from "./routes/index.js";


const app = express();

app.use(express.json());

// main route
app.use("/whapi/v1", router);

export default app