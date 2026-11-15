import "dotenv/config";
import app from "./main.js";
import { createServer } from "http";
import registerSockets from "./sockets/socket.js";
import { Server } from "socket.io";
import redisClient from "./schema/redis/redis-client.js";

const server = createServer(app);
const port = process.env.PORT || 3000;

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// attach socket.io to app
// so i can access it in controllers (req.app.get("io"))
app.set("io", io)

registerSockets(io);

redisClient.connect().then(() => console.log("connected to redis"));
server.listen(port, () => {
  console.log(`listening on http://localhost:${port}`);
});
