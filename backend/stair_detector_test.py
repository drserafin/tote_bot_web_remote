import cv2
import numpy as np
import socket
import time

# --- NETWORK SETUP (The Doorbell) ---
# We send the alert to your Node.js bridge (Running on localhost for now)
BRIDGE_IP = "127.0.0.1" 
BRIDGE_UDP_PORT = 5002  # Using a dedicated port for Vision Alerts
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

def send_alert():
    """Fires the UDP Event Packet to the Node.js Bridge"""
    try:
        sock.sendto(b"STAIR_ALERT", (BRIDGE_IP, BRIDGE_UDP_PORT))
        print("🚨 EVENT FIRED: Sent UDP 'STAIR_ALERT' to Bridge!")
    except Exception as e:
        print(f"Network error: {e}")

def main():
    cap = cv2.VideoCapture(0) # Open laptop webcam
    print("📷 Vision Thread Active: Looking for stairs...")
    
    last_alert_time = 0

    while True:
        ret, frame = cap.read()
        if not ret: break

        # 1. Computer Vision Pipeline
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150)
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=50, minLineLength=100, maxLineGap=10)

        horizontal_line_count = 0
        line_overlay = np.zeros_like(frame)

        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line
                angle = np.abs(np.arctan2(y2 - y1, x2 - x1) * 180.0 / np.pi)
                
                # Check for horizontal profile (0 or 180 degrees)
                if angle < 10 or angle > 170:
                    horizontal_line_count += 1
                    cv2.line(line_overlay, (x1, y1), (x2, y2), (0, 255, 0), 3)

        output_frame = cv2.addWeighted(frame, 0.8, line_overlay, 1.0, 0)

        # 2. THE EVENT TRIGGER LOGIC
        # If we see 4+ horizontal lines, AND we haven't sent an alert in the last 3 seconds
        current_time = time.time()
        if horizontal_line_count > 4 and (current_time - last_alert_time) > 3.0:
            
            # 🛎️ RING THE DOORBELL!
            send_alert() 
            last_alert_time = current_time
            
            # Draw visual debug on the video feed
            cv2.rectangle(output_frame, (10, 10), (450, 60), (0, 0, 255), -1)
            cv2.putText(output_frame, "⚠️ EVENT FIRED!", (20, 45), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 3)

        cv2.imshow("ToteBot Vision", output_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()