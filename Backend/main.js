import express from "express";
import router from "./routes/index.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { serve, setup } from "swagger-ui-express";
import swaggerDocument from "./swagger.json" with { type: "json" }

const app = express();


app.use(cookieParser());
app.use(
  cors({
    origin: process.env.ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

// main route
app.use("/whapi/v1", router);

app.use("/api-docs", serve, setup(swaggerDocument));

export default app;
