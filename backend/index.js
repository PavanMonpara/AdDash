import express from "express";
import mongoose from "mongoose";
import { createServer } from "http";

import routes from "./src/routes/api.js";
import appRoute from "./src/routes/app/api.js";
import exportRoutes from "./src/routes/export.js";
import { initSocket } from "./src/socket/socketManager.js";

const app = express();
const port = Number(process.env.PORT || 3001);
app.use(express.json());

const server = createServer(app);

app.get("/socket", (req, res) => {
    initSocket(server);
    res.send({ message: "Socket.IO Service is running.", success: true });
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// API Routes
app.use("/api", routes);
app.use("/api/app", appRoute);
app.use("/api/export", exportRoutes);

const start = async () => {
    const mongoUri = process.env.MONGO_URI || "mongodb+srv://Pavan:Pavan2811@cluster0.fx2fn5c.mongodb.net/?appName=Cluster0";
    const connectionDb = await mongoose.connect(mongoUri);

    console.log(`MONGO CONNECTED DB HOST : ${connectionDb.connection.host}`);

    server.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
};

start();
