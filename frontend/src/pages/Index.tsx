import { useState, useCallback, useEffect, useRef } from "react";
import { EmergencyStop } from "@/components/EmergencyStop";
import { JoystickController } from "@/components/JoystickController";
import { TrackMotors } from "@/components/TrackMotors";
import { PowerToggle } from "@/components/PowerToggle";


const API_BASE = `${window.location.protocol}//${window.location.hostname}:5000`;

const Index = () => {
  const [isPowered, setIsPowered] = useState(true);
  const [isEmergencyStop, setIsEmergencyStop] = useState(false);
  
  // These are for the visual sliders
  const [leftTrack, setLeftTrack] = useState(0);
  const [rightTrack, setRightTrack] = useState(0);
  
  // These "refs" hold the real current speed for the heartbeat loop
  // We use refs because they don't trigger re-renders
  const targetLeft = useRef(0);
  const targetRight = useRef(0);

  // --- THE HEARTBEAT LOOP ---
  useEffect(() => {
    // This timer runs every 100ms (10 times a second)
    const intervalId = setInterval(() => {
      if (isPowered && !isEmergencyStop) {
        sendToBackend(targetLeft.current, targetRight.current);
      }
    }, 100); // 100ms is the "Heartbeat" speed

    return () => clearInterval(intervalId); // Cleanup on close
  }, [isPowered, isEmergencyStop]);

  // --- NETWORK FUNCTION ---
  const sendToBackend = async (left: number, right: number) => {
    try {
      //await fetch('http://192.168.1.194:5000/api/move', { 
      //await fetch('http://localhost:5000/api/move', {
      await fetch(`${API_BASE}/api/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ left, right }),
      });
    } catch (error) {
      // It's okay to fail silently here, otherwise logs get spammy
    }
  };

  const handleJoystickMove = useCallback((x: number, y: number) => {
    if (isEmergencyStop || !isPowered) return;

    // MATH: Convert Joystick X/Y to Tank Drive
    const turnSensitivity = 1.0 - (Math.abs(y) * 0.5);
    const speed = y * 100;
    const turn = (x * turnSensitivity) * 100;

    let left = speed + turn;
    let right = speed - turn;

    // Normalize
    const maxVal = Math.max(Math.abs(left), Math.abs(right), 100);
    if (maxVal > 100) {
      left = (left / maxVal) * 100;
      right = (right / maxVal) * 100;
    }

    // Round values
    left = Math.round(left);
    right = Math.round(right);

    // Update Visuals
    setLeftTrack(left);
    setRightTrack(right);

    // Update the Heartbeat Target (The loop above will read this)
    targetLeft.current = left;
    targetRight.current = right;

  }, [isEmergencyStop, isPowered]);

  const handleEmergencyStop = useCallback(() => {
    setIsEmergencyStop(true);
    setLeftTrack(0);
    setRightTrack(0);
    targetLeft.current = 0;
    targetRight.current = 0;
    
    // Send STOP immediately (don't wait for heartbeat)
    //fetch('http://192.168.1.194:5000/api/stop', { method: 'POST' });
    //fetch('http://localhost:5000/api/stop', { method: 'POST' });
    fetch(`${API_BASE}/api/stop`, { method: "POST" });

    setTimeout(() => {
      setIsEmergencyStop(false);
    }, 2000);
  }, []);

  const handlePowerToggle = useCallback(() => {
    setIsPowered(prev => !prev);
    // Reset speeds immediately on toggle
    targetLeft.current = 0;
    targetRight.current = 0;
    setLeftTrack(0);
    setRightTrack(0);
    
    if (isPowered) {
       sendToBackend(0, 0);
    }
  }, [isPowered]);

  const isDisabled = isEmergencyStop || !isPowered;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <EmergencyStop onStop={handleEmergencyStop} isActive={isEmergencyStop} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl p-6 card-glow border border-border">
            <JoystickController
              onMove={handleJoystickMove}
              disabled={isDisabled}
            />
          </div>

          <div className="bg-card rounded-xl p-6 card-glow border border-border">
            <div className="flex flex-col items-center gap-6 h-full">
              <TrackMotors
                leftValue={leftTrack}
                rightValue={rightTrack}
                onLeftChange={setLeftTrack}
                onRightChange={setRightTrack}
                disabled={isDisabled}
              />
              <div className="mt-auto pt-4">
                <PowerToggle isOn={isPowered} onToggle={handlePowerToggle} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isPowered && !isEmergencyStop ? 'bg-accent' : 'bg-destructive'}`} />
            <span className="font-mono">
              {isEmergencyStop ? 'E-STOP ACTIVE' : isPowered ? 'READY' : 'POWERED OFF'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;