import socket
import eventlet
from flask import Flask
from flask_socketio import SocketIO

eventlet.monkey_patch()

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Hotspot / Robot Config
RPI_IP = "192.168.4.1" 
UDP_PORT = 5005
VISION_PORT = 5002 # Dedicated port for the Camera Script
udp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# --- NEW: BACKGROUND THREAD FOR CAMERA EVENTS ---
def vision_listener():
    """Listens for 'STAIR_ALERT' from the Python Camera Script"""
    alert_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    alert_sock.bind(("0.0.0.0", VISION_PORT))
    print(f"📡 Vision Listener Active on Port {VISION_PORT}")
    
    while True:
        data, addr = alert_sock.recvfrom(1024)
        if data.decode() == "STAIR_ALERT":
            print("🚨 Alert received from Camera! Forwarding to UI...")
            socketio.emit('stair_alert') # This hits your React useEffect

@socketio.on('move')
def handle_move(data):
    msg = f"{data['left']},{data['right']}".encode()
    udp_sock.sendto(msg, (RPI_IP, UDP_PORT))

@socketio.on('stop')
def handle_stop():
    udp_sock.sendto(b"0,0", (RPI_IP, UDP_PORT))

if __name__ == '__main__':
    # Start the vision listener in a background thread
    eventlet.spawn(vision_listener)
    print("🚀 Bridge Active (Laptop) -> Port 5001")
    socketio.run(app, host='0.0.0.0', port=5001)