const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server, {
    cors: {
        origin: "*",
    },
    maxHttpBufferSize: 1e8,
});
const dotenv = require("dotenv");
dotenv.config();
const PORT = process.env.SOCKET_PORT;
let serverList = [];

app.get("/", (req, res) => {
    res.send(":)");
});

io.on("connection", (socket) => {
    let id = socket.id;
    console.log("user connected", id);
    socket.on("join", (serverIp) => {
        serverList.push({
            id: id,
            ip: serverIp,
        });
        console.log(serverList);
        socket.join(serverIp);
        console.log(`user ${socket.id} join room ${serverIp}`);
        io.emit("device-connected", { id: socket.id, ip: serverIp });
    });

    socket.on("ping", (data) => {
        socket.to(data.ip).emit("ping", data);
    });

    socket.on("pong", (data) => {
        io.emit("serverResponded", {
            ip: data.ip,
            time: +new Date(),
            pingTime: data.pingTime,
        });
    });

    socket.on("upload", (data, callback) => {
        const ips = data.metaData.ip.split(",");
        ips.forEach((ip) => {
            data.metaData.ip = ip;
            console.log("upload", data.metaData);
            socket.to(ip).emit("upload", data);
        });
    });

    socket.on("uploaded", (data) => {
        io.emit("uploadSuccess", data);
    });

    socket.on("uploadFail", (data) => {
        io.emit("uploadFailed", data);
    });

    socket.on("disconnect", (socket) => {
        let server;
        serverList.forEach((data, index) => {
            if (data.id === id) {
                server = {
                    id: data.id,
                    ip: data.ip,
                };
                serverList.splice(index, 1);
            }
        });
        io.emit("device-disconnected", server);
    });

    socket.on("getAllRooms", () => {
        socket.emit("sendAllRooms", serverList);
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
