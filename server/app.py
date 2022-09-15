from cmath import log
from distutils.log import error
from fileinput import filename
import socketio
import os
import platform
from datetime import datetime
from dotenv import load_dotenv
from os.path import exists

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
def upload1(data):
    metaData = data["metaData"]
    # print(metaData)
    fileName = f"{metaData['path']}{separator}{metaData['name']}"
    file = open(fileName, "wb")
    file.write(data["file"])
    file.close()
    file_exists = exists(fileName)
    if (file_exists):
        response = {
            "status": "uploaded",
            "data": {"fileName": fileName, "ip": metaData["ip"]}
        }
    else:
        response = {
            "status": "uploadFail",
            "data": {"fileName": fileName, "ip": metaData["ip"]}
        }
    print(response)


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
        print(response)
        sio.emit(response["status"], response)


@ sio.event
def disconnect():
    print('disconnected from server')


sio.connect(SOCKET_URL)
