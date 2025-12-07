import express from "express";
import mongoose from "mongoose";
import routes from "./src/routes/api.js";
import supportChatHandler from "./src/handlers/supportChat.js";
import { createServer } from "http";
import { Server } from "socket.io";
import appRoute from "./src/routes/app/api.js";

const app = express();
const port = 3001;
app.use(express.json());

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
    }
});

supportChatHandler(io);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.use("/api", routes);
app.use("/api/app", appRoute);

const start = async () => {
    const connectionDb = await mongoose.connect("mongodb+srv://Pavan:Pavan2811@cluster0.fx2fn5c.mongodb.net/?appName=Cluster0");

    console.log(`MONGO CONNECTED DB HOST : ${connectionDb.connection.host}`);

    server.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
        console.log("Socket Running...")
    });
};

start();