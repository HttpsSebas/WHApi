import "dotenv/config";
import app from "./main.js";
import { createServer } from "http";
import registerSockets from "./sockets/socket.js";
import { Server } from "socket.io";
import redisClient from "./schema/redis/redis-client.js";
import { authMiddleware } from "./middlewares/socket/auth.middleware.js";

const server = createServer(app);
const port = process.env.PORT || 3000;

const io = new Server(server, {
  cors: {
    origin: process.env.ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

io.use(authMiddleware);

// attach socket.io to app
// so i can access it in controllers (req.app.get("io"))
app.set("io", io)

registerSockets(io);

redisClient.connect()
server.listen(port, "0.0.0.0");
