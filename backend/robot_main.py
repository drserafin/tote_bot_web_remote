import socket
import time
import threading
import pigpio
from flask import Flask, jsonify
from flask_cors import CORS
from motor_logic import DriveSystem

# --- PID & ENCODER CLASSES ---
class PID:
    def __init__(self, kp, ki, kd):
        self.kp, self.ki, self.kd = kp, ki, kd
        self.setpoint = 0
        self.prev_error = 0
        self.integral = 0
        self.last_time = time.time()

    def update(self, measured_value):
        now = time.time()
        dt = now - self.last_time
        if dt <= 0: return 0
        
        error = self.setpoint - measured_value
        self.integral += error * dt
        self.integral = max(-50, min(50, self.integral)) # Windup Protection
        
        derivative = (error - self.prev_error) / dt
        output = (self.kp * error) + (self.ki * self.integral) + (self.kd * derivative)
        
        self.prev_error = error
        self.last_time = now
        return output

class EncoderReader:
    def __init__(self, pi, gpio_a, gpio_b):
        self.pi, self.ppr = pi, 1993.6
        self.count = 0
        self.last_count = 0
        self.last_time = time.time()
        
        pi.set_mode(gpio_a, pigpio.INPUT)
        pi.set_pull_up_down(gpio_a, pigpio.PUD_UP)
        pi.set_mode(gpio_b, pigpio.INPUT)
        pi.set_pull_up_down(gpio_b, pigpio.PUD_UP)
        
        # Callback for high-speed pulse counting
        self.cb = pi.callback(gpio_a, pigpio.EITHER_EDGE, self._on_pulse)

    def _on_pulse(self, gpio, level, tick):
        # Quadrature direction detection
        self.count += 1 if level == self.pi.read(27) else -1

    def get_rpm(self):
        now = time.time()
        dt = now - self.last_time
        if dt < 0.05: return 0 # Limit update frequency
        
        delta_ticks = self.count - self.last_count
        rpm = (delta_ticks / self.ppr) * (60.0 / dt)
        
        self.last_count = self.count
        self.last_time = now
        return rpm

# --- System Setup ---
pi = pigpio.pi()
robot = DriveSystem(dummy_mode=False)
lock = threading.Lock()

# Encoder on GPIO 17 & 27
encoder_left = EncoderReader(pi, 17, 27)

# PID Tuning (Starting values for high-torque planetary motors)
# Note: These will need manual tuning once on the stairs!
pid_left = PID(kp=1.2, ki=0.5, kd=0.1)

# Telemetry Server
app = Flask(__name__)
CORS(app)

@app.route('/api/status', methods=['GET'])
def handle_status():
    with lock:
        voltage = robot.get_voltage()
    return jsonify({"voltage": voltage})

# --- Motor PID Loop (UDP/5005) ---
def motor_loop():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", 5005))
    sock.setblocking(False)

    MAX_RPM = 130 # Target RPM at 12V for these motors
    last_packet = time.time()

    while True:
        try:
            data, _ = sock.recvfrom(1024)
            l_percent, r_percent = map(int, data.decode().split(','))
            
            # 1. Update PID Setpoints
            pid_left.setpoint = (l_percent / 100.0) * MAX_RPM
            last_packet = time.time()
            
        except BlockingIOError:
            # Watchdog check
            if time.time() - last_packet > 0.3:
                pid_left.setpoint = 0
                with lock: robot.stop()

        # 2. RUN PID CALCULATIONS (Every 20ms)
        current_rpm = encoder_left.get_rpm()
        # PID Output is a corrected percentage for the Motoron (-100 to 100)
        correction = pid_left.update(current_rpm)

        # 3. Apply corrected power to hardware
        with lock:
            # We use the PID output for the left, and raw for the right (until you add 2nd encoder)
            robot.set_motors(correction, 0) 
            
        time.sleep(0.02) # 50Hz Loop

if __name__ == '__main__':
    if not pi.connected:
        print("❌ PIGPIO Daemon not started! Run: sudo pigpiod")
    else:
        threading.Thread(target=motor_loop, daemon=True).start()
        print("🚀 ToteBot PID Brain Active (UDP: 5005 | HTTP: 5000)")
        app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)