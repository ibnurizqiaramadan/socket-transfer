const socketUrl = document
    .querySelector(`meta[name="socket-url"]`)
    .getAttribute("content");
let serverList = [];
const serverListContainer = document.getElementById("server-list");
const btnUpload = document.getElementById("btn-upload");
const btnDownlod = document.getElementById("btn-download");
const term = new Terminal({
    cursorBlink: "block",
});

var curr_line = "";
var entries = [];
var currPos = 0;
var pos = 0;

term.open(document.getElementById("terminal"));
term.prompt = () => {
    term.write("\n\r" + curr_line + "\r\n\u001b[32mssh> \u001b[37m");
};
term.write("Hello");
term.prompt();

term.on("key", function (key, ev) {
    const printable =
        !ev.altKey &&
        !ev.altGraphKey &&
        !ev.ctrlKey &&
        !ev.metaKey &&
        !(ev.keyCode === 37 && term.buffer.cursorX < 6);

    if (ev.keyCode === 13) {
        // Enter key
        if (curr_line.replace(/^\s+|\s+$/g, "").length != 0) {
            // Check if string is all whitespace
            entries.push(curr_line);
            currPos = entries.length - 1;
            const ip = document.getElementById("ipssh");
            socket.emit("sshCommand", {
                ip: ip.value,
                command: curr_line,
            });
            // term.prompt();
            term.write("\r\n");
            console.log(curr_line);
        } else {
            term.write("\n\33[2K\r\u001b[32mssh> \u001b[37m");
        }
        curr_line = "";
    } else if (ev.keyCode === 8) {
        // Backspace
        if (term.buffer.cursorX > 5) {
            curr_line =
                curr_line.slice(0, term.buffer.cursorX - 6) +
                curr_line.slice(term.buffer.cursorX - 5);
            pos = curr_line.length - term.buffer.cursorX + 6;
            term.write("\33[2K\r\u001b[32mssh> \u001b[37m" + curr_line);
            term.write("\033[".concat(pos.toString()).concat("D")); //term.write('\033[<N>D');
            if (
                term.buffer.cursorX == 5 ||
                term.buffer.cursorX == curr_line.length + 6
            ) {
                term.write("\033[1C");
            }
        }
    } else if (ev.keyCode === 38) {
        // Up arrow
        if (entries.length > 0) {
            if (currPos > 0) {
                currPos -= 1;
            }
            curr_line = entries[currPos];
            term.write("\33[2K\r\u001b[32mssh> \u001b[37m" + curr_line);
        }
    } else if (ev.keyCode === 40) {
        // Down arrow
        currPos += 1;
        if (currPos === entries.length || entries.length === 0) {
            currPos -= 1;
            curr_line = "";
            term.write("\33[2K\r\u001b[32mssh> \u001b[37m");
        } else {
            curr_line = entries[currPos];
            term.write("\33[2K\r\u001b[32mssh> \u001b[37m" + curr_line);
        }
    } else if (
        printable &&
        !(ev.keyCode === 39 && term.buffer.cursorX > curr_line.length + 4)
    ) {
        if (ev.keyCode != 37 && ev.keyCode != 39) {
            var input = ev.key;
            if (ev.keyCode == 9) {
                // Tab
                input = "    ";
            }
            pos = curr_line.length - term.buffer.cursorX + 4;
            curr_line = [
                curr_line.slice(0, term.buffer.cursorX - 5),
                input,
                curr_line.slice(term.buffer.cursorX - 5),
            ].join("");
            term.write("\33[2K\r\u001b[32mssh> \u001b[37m" + curr_line);
            term.write("\033[".concat(pos.toString()).concat("D")); //term.write('\033[<N>D');
        } else {
            term.write(key);
        }
    }
});

term.on("paste", function (data) {
    curr_line += data;
    term.write(curr_line);
});
const socket = io(socketUrl);
let pingInterval;
const ConsoleUpload = $("#console-upload");
const ConsoleDownload = $("#console-download");

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
                    `Uploading ${response.files.length} files to ${ip.value}`,
                    ConsoleUpload
                );
            },
        });
    }
});

btnDownlod.addEventListener("click", () => {
    const pathsrc = document.getElementById("pathsrcd");
    const path = document.getElementById("pathd");
    const ip = document.getElementById("ipd");
    const metaData = {
        ip: ip.value,
        pathdes: path.value,
        pathsrc: pathsrc.value,
    };
    socket.emit("download", { metaData: metaData });
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
    // addToConsole(`${data.ip} has disconnected`);
});
socket.on("device-connected", (data) => {
    serverList.push(data);
    appendServerIp(data.ip);
    $(`#server-${data.ip.replace(/\./g, "")}`).prop("disabled", false);
    // addToConsole(`${data.ip} has connected`);
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
        `❌ Destination : ${file.ip} File : ${file.fileName} Failed : ${data.message}`,
        ConsoleUpload
    );
});

socket.on("uploadSuccess", (data) => {
    console.log(data);
    const file = data.data;
    addToConsole(
        `✔ Destination : ${file.ip} File : ${file.fileName}`,
        ConsoleUpload
    );
});

socket.on("downloadSuccess", (data) => {
    console.log(data);
    addToConsole(`✔ Destination : ${data.filePath}`, ConsoleDownload);
});

socket.on("getFileCountDownload", (data) => {
    console.log(data);
    addToConsole(
        `Downloading ${data.count} files from ${data.metaData.ip}`,
        ConsoleDownload
    );
});

socket.on("sshCommandGetResult", (data) => {
    // console.log(data);
    // addToConsole(`Run SSH Command\nCommand : ${data.command}\n${data.result}`);
    term.write(data.result.replace(/\n/g, "\r\n"));
});

socket.on("sshCommandFinish", (data) => {
    term.prompt();
});

function addToConsole(data, console_) {
    console_.append(
        `${moment(+new Date()).format("YYYY.MM.DD-H:mm:ss")} - ${data}\n`
    );
    console_?.scrollTop(console_[0]?.scrollHeight - console_?.height());
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
    $(`input[id*="server-"]`)
        .unbind()
        .change(function (e) {
            const checked = $(`input[id*="server-"]:checked`);
            let ips = "";
            for (let index = 0; index < checked.length; index++) {
                const element = checked[index];
                ips += `${$(element).val()},`;
            }
            const ipField = $(`#ip`);
            const ipFieldDownload = $(`#ipd`);
            const ipFieldSSH = $(`#ipssh`);
            ipField.val(ips.substring(0, ips.length - 1));
            ipFieldDownload.val(ips.substring(0, ips.length - 1));
            ipFieldSSH.val(ips.substring(0, ips.length - 1));
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
