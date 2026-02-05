from flask import Flask, request, jsonify
from flask_cors import CORS
from drive import DriveSystem
import signal
import sys

app = Flask(__name__)
CORS(app) # Allow the website to talk to the robot

# Initialize Robot
robot = DriveSystem(dummy_mode=False)

@app.route('/api/move', methods=['POST'])
def handle_move():
    data = request.json
    left = int(data.get('left', 0))
    right = int(data.get('right', 0))
    
    # DEBUG PRINT: This proves the website connected!
    print(f"?? Command Received -> Left: {left} | Right: {right}")
    
    robot.set_motors(left, right)
    return jsonify({"status": "ok"})

@app.route('/api/stop', methods=['POST'])
def handle_stop():
    print("?? STOP COMMAND")
    robot.stop()
    return jsonify({"status": "stopped"})

@app.route('/api/status', methods=['GET'])
def handle_status():
    voltage = robot.get_voltage()
    return jsonify({"voltage": voltage})

def signal_handler(sig, frame):
    robot.cleanup()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

if __name__ == '__main__':
    # This 0.0.0.0 is what lets your phone connect!
    print("?? Server Online on port 5000")
    app.run(host='0.0.0.0', port=5000)
