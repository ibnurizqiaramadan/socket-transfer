from cmath import log
from pathlib import Path
import socketio
import os
import platform
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

sio = socketio.Client()

DEVICE_IP = os.getenv('DEVICE_IP')
SOCKET_URL = os.getenv("SOCKET_URL")

separator = '\\' if platform.system() == 'Windows' else '/'


@sio.event
def connect():
    print(f"Socket connected to {SOCKET_URL}")
    sio.emit('join', DEVICE_IP)


@sio.event
def ping(data):
    if data['ip'] == DEVICE_IP:
        sio.emit('pong', {"ip": DEVICE_IP, "pingTime": data["time"]})


@sio.event
def upload(data):
    try:
        metaData = data["metaData"]
        # print(metaData)
        fileName = f"{metaData['path']}{separator}{metaData['name']}"
        file = open(fileName, "wb")
        file.write(data["file"])
        file.close()
        # file_exists = exists(fileName)
        response = {
            "status": "uploaded",
            "data": {"fileName": fileName, "ip": metaData["ip"]},
            "message": "Upload Success"
        }
    except FileNotFoundError:
        response = {
            "status": "uploadFail",
            "data": {"fileName": fileName, "ip": metaData["ip"]},
            "message": "Directory or file not found"
        }
    except PermissionError:
        response = {
            "status": "uploadFail",
            "data": {"fileName": fileName, "ip": metaData["ip"]},
            "message": "Permission Error"
        }
    finally:
        response["sender"] = data["sender"]
        print(response)
        sio.emit(response["status"], response)


@sio.event
def download(data):
    try:
        metaData = data["metaData"]
        files = os.listdir(metaData["pathsrc"])
        filesCollection = []
        for file in files:
            filePath = f"{metaData['pathsrc']}{separator}{file}"
            if os.path.isfile(filePath):
                filesCollection.append(file)

        sio.emit("fileCountDownload", {
                 "metaData": metaData, "count": len(filesCollection)})

        for file in filesCollection:
            filePath = f"{metaData['pathsrc']}{separator}{file}"
            bufferFile = open(filePath, "rb")
            byte = bufferFile.read()
            bufferFile.close()
            data["metaData"]["fileName"] = file
            data["metaData"]["filePath"] = filePath = f"{metaData['pathdes']}{separator}{file}"
            sio.emit("sendFile", {"data": data, "file": byte, })
    except:
        print("hello")

    finally:
        sio.emit("hello")


@sio.event
def runSshCommand(data):
    output_stream = os.popen(data["command"])
    for line in output_stream:
        sio.emit("sshCommandResult", {
                 "command": data["command"], "result": line, "sender": data["sender"]})
    sio.emit("sshCommandDone", {
             "command": data["command"], "sender": data["sender"]})


@ sio.event
def disconnect():
    print('disconnected from server')


@sio.event
def serverCreateDirectory(data):
    dir_ = data["dir"]
    path_ = data["path"]
    check = f"{path_}{separator}{dir_}"
    checkPath = Path(check)
    if checkPath.exists() == False:
        os.makedirs(checkPath)


@sio.event
def serverSendFile(data):
    path = data["des"]
    fileName = f"{path}{separator}{data['name']}"
    file = open(fileName, "wb")
    file.write(data["file"])
    file.close()


sio.connect(SOCKET_URL)
