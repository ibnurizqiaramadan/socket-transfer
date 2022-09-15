const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const app = express();
dotenv.config();

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

app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`);
});
