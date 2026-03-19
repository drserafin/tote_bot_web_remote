import { useState, useCallback, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { EmergencyStop } from "@/components/EmergencyStop";
import { JoystickController } from "@/components/JoystickController";
import { TrackMotors } from "@/components/TrackMotors";
import { PowerToggle } from "@/components/PowerToggle";
import { StairModeToggle } from "@/components/StairModeToggle";

const BRIDGE_URL = "http://localhost:5001";
const ROBOT_URL = "http://192.168.4.1:5000";

const bridgeSocket = io(BRIDGE_URL);

const Index = () => {
  const [isPowered, setIsPowered] = useState(true);
  const [isEmergencyStop, setIsEmergencyStop] = useState(false);
  const [isStairMode, setIsStairMode] = useState(false);
  const [voltage, setVoltage] = useState(0);
  const [leftTrack, setLeftTrack] = useState(0);
  const [rightTrack, setRightTrack] = useState(0);
  const [isBridgeConnected, setIsBridgeConnected] = useState(false);
  const [isRobotConnected, setIsRobotConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [logs, setLogs] = useState<{msg: string, time: string}[]>([]);
  
  const targetLeft = useRef(0);
  const targetRight = useRef(0);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [{ msg, time }, ...prev].slice(0, 5)); // Shorter log for mobile
  };

  useEffect(() => {
    const onConnect = () => { setIsBridgeConnected(true); addLog("Link: Bridge OK"); };
    const onDisconnect = () => { setIsBridgeConnected(false); addLog("Link: Bridge Lost"); };
    bridgeSocket.on("connect", onConnect);
    bridgeSocket.on("disconnect", onDisconnect);
    return () => { bridgeSocket.off("connect"); bridgeSocket.off("disconnect"); };
  }, []);

  useEffect(() => {
    const fetchTelemetry = async () => {
      const start = Date.now();
      try {
        const res = await fetch(`${ROBOT_URL}/api/status`);
        const data = await res.json();
        setVoltage(data.voltage / 1000);
        setIsRobotConnected(true);
        setLatency(Date.now() - start);
      } catch (e) { setIsRobotConnected(false); }
    };
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (isPowered && !isEmergencyStop && isBridgeConnected) {
        bridgeSocket.emit('move', { left: targetLeft.current, right: targetRight.current });
      }
    }, 50);
    return () => clearInterval(heartbeat);
  }, [isPowered, isEmergencyStop, isBridgeConnected]);

  const handleJoystickMove = useCallback((x: number, y: number) => {
    if (isEmergencyStop || !isPowered) return;
    const multiplier = isStairMode ? 0.35 : 1.0;
    const turnSensitivity = 1.0 - (Math.abs(y) * 0.5);
    const speed = (y * 100) * multiplier;
    const turn = (x * turnSensitivity) * 100 * multiplier;
    let left = Math.round(speed + turn);
    let right = Math.round(speed - turn);
    left = Math.max(-100, Math.min(100, left));
    right = Math.max(-100, Math.min(100, right));
    setLeftTrack(left);
    setRightTrack(right);
    targetLeft.current = left;
    targetRight.current = right;
  }, [isEmergencyStop, isPowered, isStairMode]);

  const handleEmergencyStop = useCallback(() => {
    setIsEmergencyStop(true);
    targetLeft.current = 0; targetRight.current = 0;
    setLeftTrack(0); setRightTrack(0);
    bridgeSocket.emit('stop');
    addLog("🚨 E-STOP");
    setTimeout(() => setIsEmergencyStop(false), 2000);
  }, []);

  return (
    // "overscroll-none" and "touch-none" prevent the iPhone from sliding the page around while using the joystick
    <div className="min-h-screen bg-[#050607] text-white p-4 md:p-6 select-none touch-none overscroll-none overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
        
        {/* Header: Compact on Mobile */}
        <div className="flex justify-between items-center bg-white/5 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-md">
          <div>
            <h1 className="text-lg md:text-2xl font-black uppercase tracking-tighter italic">
              Tote<span className="text-cyan-500">Bot</span> <span className="hidden md:inline">Robot</span>
            </h1>
            <p className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest">Ground Control</p>
          </div>
          <div className="text-right">
            <span className="block text-[8px] font-black text-slate-500 uppercase">Battery</span>
            <span className={`text-lg md:text-2xl font-mono font-bold ${voltage > 0 && voltage < 11.5 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
              {voltage > 0 ? `${voltage.toFixed(2)}V` : "---"}
            </span>
          </div>
        </div>

        {/* E-Stop: Always Full Width */}
        <EmergencyStop onStop={handleEmergencyStop} isActive={isEmergencyStop} />

        {/* Main Grid: 1 Column on Mobile, 3 on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          
          {/* Joystick Area: High Priority for Touch */}
          <div className="lg:col-span-2 bg-[#0f1113] rounded-[2rem] md:rounded-[3.5rem] p-6 md:p-12 border border-white/5 flex justify-center items-center shadow-2xl relative overflow-hidden min-h-[300px] md:min-h-[450px]">
              {isStairMode && <div className="absolute inset-0 bg-orange-500/[0.04] animate-pulse pointer-events-none" />}
              <JoystickController onMove={handleJoystickMove} disabled={!isPowered || isEmergencyStop} />
          </div>

          {/* Controls & Telemetry Column */}
          <div className="flex flex-col gap-4 md:gap-6">
            
            {/* Status & Mode Toggles */}
            <div className="bg-[#0f1113] rounded-[2rem] p-6 border border-white/5 flex flex-row lg:flex-col items-center justify-around md:justify-center gap-4 md:gap-8 shadow-xl">
               {/* Tracks hidden or shrunk on very small mobile to save space if needed */}
               <div className="hidden sm:block lg:block">
                 <TrackMotors 
                    leftValue={leftTrack} 
                    rightValue={rightTrack} 
                    onLeftChange={setLeftTrack}
                    onRightChange={setRightTrack}
                    disabled={!isPowered || isEmergencyStop} 
                 />
               </div>

               {/* Toggle Buttons: Perfectly sized for thumbs */}
               <div className="flex items-center gap-4">
                  <PowerToggle isOn={isPowered} onToggle={() => {
                    setIsPowered(!isPowered);
                    addLog(!isPowered ? "Power: ON" : "Power: OFF");
                    if (isPowered) bridgeSocket.emit('stop');
                  }} />
                  <StairModeToggle 
                    isActive={isStairMode} 
                    onToggle={() => {
                      setIsStairMode(!isStairMode);
                      addLog(`Stair Mode: ${!isStairMode ? 'ON' : 'OFF'}`);
                    }} 
                    disabled={!isPowered || isEmergencyStop}
                  />
               </div>
            </div>

            {/* System Health (Hidden on small mobile to reduce clutter) */}
            <div className="hidden md:block bg-[#0f1113] border border-white/5 rounded-3xl p-6 shadow-xl">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>Network</span>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px]">BRIDGE</span>
                    <div className={`w-2 h-2 rounded-full ${isBridgeConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px]">ROBOT</span>
                    <div className={`w-2 h-2 rounded-full ${isRobotConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;