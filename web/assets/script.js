const socketUrl = document
    .querySelector(`meta[name="socket-url"]`)
    .getAttribute("content");
let serverList = [];
const serverListContainer = document.getElementById("server-list");
const btnUpload = document.getElementById("btn-upload");

const socket = io(socketUrl);
let pingInterval;

btnUpload.addEventListener("click", () => {
    const file = document.getElementById("file");
    const path = document.getElementById("path");
    const ip = document.getElementById("ip");
    const metaData = {
        name: file.files[0].name,
        size: file.files[0].size,
        ip: ip.value,
        path: path.value,
    };
    socket.emit(
        "upload",
        { metaData: metaData, file: file.files[0] },
        (status) => {
            console.log(status);
        }
    );
});

socket.on("connect", () => {
    console.log(`Socket connected to ${socketUrl}`);
    clearInterval(pingInterval);
    loadServerList();
});

socket.on("sendAllRooms", (data) => {
    serverList = data;
    serverListContainer.innerHTML = "";
    data.forEach((server) => {
        appendServerIp(server.ip);
    });
});

socket.on("device-disconnected", (data) => {
    let serverItem = document.getElementById(
        `server-${data.ip.replace(/\./g, "")}`
    );
    serverItem.style.setProperty("color", "red");
    serverItem.innerHTML = `${data.ip}`;
});
socket.on("device-connected", (ip) => {
    serverList.push(ip);
    appendServerIp(ip);
});

socket.on("serverResponded", (data) => {
    let ms = Math.floor((data.time - data.pingTime) / 100);
    let serverItem = document.getElementById(
        `server-${data.ip.replace(/\./g, "")}`
    );
    serverItem.style.setProperty("color", "green");
    serverItem.innerHTML = `${data.ip} - ${ms}ms`;
});

socket.on("uploadFailed", (data) => {
    console.log(data);
});

function appendServerIp(ip) {
    const serverItem = document.createElement("p");
    serverItem.textContent = ip;
    serverItem.setAttribute("id", `server-${ip.replace(/\./g, "")}`);
    serverItem.style.setProperty("color", "red");
    serverListContainer.append(serverItem);
}

function pingServer() {
    pingInterval = setInterval(() => {
        serverList.forEach((server) => {
            socket.emit("ping", { ip: server.ip, time: +new Date() });
        });
    }, 500);
}

function loadServerList() {
    socket.emit("getAllRooms");
    pingServer();
}
