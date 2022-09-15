const socketUrl = document
    .querySelector(`meta[name="socket-url"]`)
    .getAttribute("content");
let serverList = [];
const serverListContainer = document.getElementById("server-list");
const btnUpload = document.getElementById("btn-upload");

const socket = io(socketUrl);
let pingInterval;
const Console_ = $("#console");

btnUpload.addEventListener("click", () => {
    const file = document.getElementById("file");
    const pathsrc = document.getElementById("pathsrc");
    const path = document.getElementById("path");
    const ip = document.getElementById("ip");
    // console.log(file.files);
    if (pathsrc.value.trim() == "") {
        if (file.files.length > 0) {
            Object.values(file.files).forEach((file) => {
                const metaData = {
                    name: file.name,
                    size: file.size,
                    ip: ip.value,
                    path: path.value,
                };
                socket.emit(
                    "upload",
                    { metaData: metaData, file: file },
                    (status) => {
                        console.log(status);
                    }
                );
            });
        }
    } else {
        $.ajax({
            url: "/upload-path",
            method: "get",
            data: {
                src: pathsrc.value.trim(),
                des: path.value.trim(),
                ip: ip.value,
            },
            success: function (response) {
                console.log(response);
                addToConsole(
                    `Uploading ${response.files.length} files to ${ip.value}`
                );
            },
        });
    }
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
    const label = $(`label[for="server-${data.ip.replace(/\./g, "")}"]`);
    label.removeClass("text-success").addClass("text-danger").text(data.ip);
    $(`#server-${data.ip.replace(/\./g, "")}`)
        .prop("disabled", true)
        .prop("checked", false);
    addToConsole(`${data.ip} has disconnected`);
});
socket.on("device-connected", (data) => {
    serverList.push(data);
    appendServerIp(data.ip);
    $(`#server-${data.ip.replace(/\./g, "")}`).prop("disabled", false);
    addToConsole(`${data.ip} has connected`);
});

socket.on("serverResponded", (data) => {
    let ms = Math.floor((data.time - data.pingTime) / 100);
    const label = $(`label[for="server-${data.ip.replace(/\./g, "")}"]`);
    label
        .removeClass("text-danger")
        .addClass("text-success")
        .text(`${data.ip} - ${ms}ms`);
});

socket.on("uploadFailed", (data) => {
    console.log(data);
    const file = data.data;
    addToConsole(
        `❌ Destination : ${file.ip} File : ${file.fileName} Failed : ${data.message}`
    );
});

socket.on("uploadSuccess", (data) => {
    console.log(data);
    const file = data.data;
    addToConsole(`✔ Destination : ${file.ip} File : ${file.fileName}`);
});

function addToConsole(data) {
    Console_.append(
        `${moment(+new Date()).format("YYYY.MM.DD-H:mm:ss")} - ${data}\n`
    );
    Console_.scrollTop(Console_[0].scrollHeight - Console_.height());
}

function appendServerIp(ip) {
    const label = $(`label[for="server-${ip.replace(/\./g, "")}"]`);
    if (label.length > 0) return;
    let html = `
        <div class="form-check">
            <input class="form-check-input" type="checkbox" value="${ip}" 
            id="server-${ip.replace(/\./g, "")}">
            <label class="form-check-label text-danger" 
            for="server-${ip.replace(/\./g, "")}">
                ${ip}
            </label>
        </div>
    `;
    $("#server-list").append(html);
    $(`input[id*="server-"]`).change(function (e) {
        const checked = $(`input[id*="server-"]:checked`);
        const data = $(this).val();
        let ips = "";
        Object.values(checked).forEach((item) => {
            // ips += `${$(item).val()},`;
        });
        // $("#ip").val(ips.substr(0, ips.length - 1));
        return;
        // alert(data);
        if (checked) {
            const ipField = $(`#ip`);
            ipField.val(data);
        }
    });
}

function pingServer() {
    pingInterval = setInterval(() => {
        serverList.forEach((server) => {
            socket.emit("ping", { ip: server.ip, time: +new Date() });
        });
    }, 1000);
}

function loadServerList() {
    socket.emit("getAllRooms");
    pingServer();
}
