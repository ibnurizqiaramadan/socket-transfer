const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const app = express();
const io = require("socket.io-client");
const fs = require("fs");
dotenv.config();

const socket = io(process.env.SOCKET_URL);
const PORT = process.env.PORT;
app.use(express.static("./web/assets"));
app.set("views", path.join(`./web`, "views"));
app.set("view engine", "pug");

app.get("/", (req, res) => {
    return res.render("main", {
        socketUrl: process.env.SOCKET_URL,
        time: Date.now(),
    });
});

app.get("/upload-path", (req, res) => {
    let response = {};
    try {
        if (req.query.ip.trim() == "")
            throw {
                message: "bad request",
            };
        const files = fs
            .readdirSync(req.query.src)
            .filter(
                (file) =>
                    fs.lstatSync(`${req.query.src}/${file}`).isFile() === true
            );

        files.forEach((file) => {
            let open = fs.readFileSync(`${req.query.src}/${file}`);
            const metaData = {
                name: file,
                ip: req.query.ip,
                path: req.query.des,
            };
            socket.emit("upload", { metaData: metaData, file: open });
        });
        response = {
            files: files,
        };
    } catch (error) {
        response = {
            error: error,
            message: error.message,
        };
    } finally {
        return res.send(response);
    }
});

socket.on("receiveFile", (data) => {
    // console.log(data.metaData);
    // return;
    const metaData = data.data.metaData;
    fs.writeFile(
        `${metaData.pathdes}/${metaData.fileName}`,
        data.file,
        function (err) {
            if (err) {
                return socket.emit("downloadFail", metaData);
            }
            socket.emit("downloaded", metaData);
        }
    );
});

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
});
