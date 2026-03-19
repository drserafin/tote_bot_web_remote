import socket
import eventlet
from flask import Flask
from flask_socketio import SocketIO

eventlet.monkey_patch()

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Hotspot IP
RPI_IP = "192.168.4.1" 
UDP_PORT = 5005
udp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

@socketio.on('move')
def handle_move(data):
    msg = f"{data['left']},{data['right']}".encode()
    udp_sock.sendto(msg, (RPI_IP, UDP_PORT))

@socketio.on('stop')
def handle_stop():
    udp_sock.sendto(b"0,0", (RPI_IP, UDP_PORT))

if __name__ == '__main__':
    print("🚀 Bridge Active (Laptop) -> Forwarding to RPi 5 Hotspot")
    socketio.run(app, host='0.0.0.0', port=5001)