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
    res.send("Socket ready");
});

io.on("connection", (socket) => {
    let id = socket.id;
    console.log("user connected", id);
    io.to(id).emit("connected", id)
    // socket.join(id);
    socket.on("join", (serverIp) => {
        serverList.push({
            id: id,
            ip: serverIp,
        });
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

    socket.on("upload", async (data) => {
        const ips = data.metaData.ip.split(",");
        const fileee = await data.file;
        ips.forEach((ip) => {
            data.metaData.ip = ip;
            data.sender = id;
            socket.to(ip).emit("upload", data);
        });
    });

    socket.on("download", async (data) => {
        data.sender = id;
        socket.to(data.metaData.ip).emit("download", data);
    });

    socket.on("uploaded", (data) => {
        data.sender = id;
        console.log(data.sender, "uploaded");
        io.to(data.sender).emit("uploadSuccess", data);
    });

    socket.on("uploadFail", (data) => {
        console.log(data.sender, "fail");
        io.to(data.sender).emit("uploadFailed", data);
    });

    socket.on("downloaded", (data) => {
        console.log(data.sender, "downloaded");
        io.to(data.sender).emit("downloadSuccess", data);
    });

    socket.on("downloadFail", (data) => {
        console.log(data.sender, "fail");
        io.to(data.sender).emit("downloadFailed", data);
    });

    socket.on("fileCountDownload", (data) => {
        io.to(data.sender).emit("getFileCountDownload", data);
    });

    socket.on("sendFile", (data) => {
        io.emit("receiveFile", data);
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

    socket.on("sshCommand", (data) => {
        data.sender = id;
        socket.to(data.ip).emit("runSshCommand", data);
    });

    socket.on("sshCommandResult", (data) => {
        console.log(data.sender);
        io.to(data.sender).emit("sshCommandGetResult", data);
    });

    socket.on("sshCommandDone", (data) => {
        console.log(data.sender);
        io.to(data.sender).emit("sshCommandFinish", data);
    });

    socket.on("watcherCreateDirectory", data => {
        io.emit("serverCreateDirectory", data)
    })

    socket.on("watcherSendFile", data => {
        io.emit("serverSendFile", data)
    })
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
