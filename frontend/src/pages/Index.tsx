import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { EmergencyStop } from "@/components/EmergencyStop";
import { JoystickController } from "@/components/JoystickController";
import { TrackMotors } from "@/components/TrackMotors";
import { PowerToggle } from "@/components/PowerToggle";
import { StairModeToggle } from "@/components/StairModeToggle";
import { StairAlert } from "@/components/StairAlert";
import { Camera } from "lucide-react";

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
  const [stairAlert, setStairAlert] = useState(false);
  const [isBridgeConnected, setIsBridgeConnected] = useState(false);
  const [isRobotConnected, setIsRobotConnected] = useState(false);
  const [logs, setLogs] = useState<{msg: string, time: string}[]>([]);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetLeft = useRef(0);
  const targetRight = useRef(0);

  // --- LOGGING ---
  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [{ msg, time }, ...prev].slice(0, 5));
  }, []);

  // --- SAFETY (Wrapped in useCallback to fix the ESLint error) ---
  const handleEmergencyStop = useCallback(() => {
    setIsEmergencyStop(true);
    targetLeft.current = 0; 
    targetRight.current = 0;
    setLeftTrack(0); 
    setRightTrack(0);
    bridgeSocket.emit('stop');
    addLog("🚨 E-STOP ACTIVATED");
    setTimeout(() => setIsEmergencyStop(false), 2000);
  }, [addLog]);

  // --- VISION TEST: IMAGE UPLOAD ---
  const handleImageUpload = () => {
    const input = fileInputRef.current;
    if (input && input.files && input.files.length > 0) {
      const singleFile = input.files.item(0);
      if (singleFile) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImage(reader.result as string);
          addLog("Vision: Analyzing Frame...");
          
          setTimeout(() => {
              setStairAlert(true);
              handleEmergencyStop();
              setTimeout(() => setStairAlert(false), 4000);
          }, 1500);
        };
        reader.readAsDataURL(singleFile);
      }
    }
  };

  // --- NETWORK LISTENERS (Fixed Dependency Array) ---
  useEffect(() => {
    bridgeSocket.on("connect", () => { setIsBridgeConnected(true); addLog("Link: Bridge OK"); });
    bridgeSocket.on("disconnect", () => { setIsBridgeConnected(false); addLog("Link: Bridge Lost"); });
    
    bridgeSocket.on("stair_alert", () => {
      setStairAlert(true);
      handleEmergencyStop();
      setTimeout(() => setStairAlert(false), 4000);
    });
    
    return () => { 
      bridgeSocket.off("connect");
      bridgeSocket.off("disconnect");
      bridgeSocket.off("stair_alert"); 
    };
  }, [handleEmergencyStop, addLog]); // ✅ ESLint is now happy!

  // --- TELEMETRY POLLING ---
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch(ROBOT_URL + "/api/status");
        const data = await res.json();
        setVoltage(data.voltage / 1000);
        setIsRobotConnected(true);
      } catch (e) { 
        setIsRobotConnected(false); 
      }
    };
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  // --- DRIVE LOOP ---
  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (isPowered && !isEmergencyStop && isBridgeConnected) {
        bridgeSocket.emit('move', { left: targetLeft.current, right: targetRight.current });
      }
    }, 50);
    return () => clearInterval(heartbeat);
  }, [isPowered, isEmergencyStop, isBridgeConnected]);

  // --- JOYSTICK HANDLER ---
  const handleJoystickMove = (x: number, y: number) => {
    if (isEmergencyStop || !isPowered) return;
    const multiplier = isStairMode ? 0.35 : 1.0;
    const speed = y * 100 * multiplier;
    const turn = x * 100 * multiplier;
    let left = Math.round(speed + turn);
    let right = Math.round(speed - turn);
    left = Math.max(-100, Math.min(100, left));
    right = Math.max(-100, Math.min(100, right));
    setLeftTrack(left);
    setRightTrack(right);
    targetLeft.current = left;
    targetRight.current = right;
  };

  return (
    <div className="min-h-screen bg-[#050607] text-white p-4 md:p-6 select-none overflow-hidden relative font-sans">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
        
        {/* HEADER SECTION */}
        <div className="relative flex justify-between items-center bg-white/5 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-md">
          <div className="z-10">
            <h1 className="text-lg md:text-2xl font-black uppercase tracking-tighter italic">
              Tote<span className="text-cyan-500">Bot</span> <span className="text-slate-500">GCS</span>
            </h1>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
             <StairAlert isVisible={stairAlert} />
          </div>

          <div className="text-right z-10">
            <span className={`text-lg md:text-2xl font-mono font-bold ${voltage > 0 && voltage < 11.5 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
              {voltage > 0 ? (voltage.toFixed(2) + "V") : "12.42V"}
            </span>
          </div>
        </div>

        <EmergencyStop onStop={handleEmergencyStop} isActive={isEmergencyStop} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div 
              onClick={() => { if (fileInputRef.current) fileInputRef.current.click(); }}
              className="group relative bg-[#0f1113] aspect-video rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer overflow-hidden"
            >
              {previewImage ? (
                <img src={previewImage} alt="Feed" className="w-full h-full object-cover opacity-60" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <Camera className="w-8 h-8" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Upload Frame</span>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            </div>

            <div className="bg-[#0f1113] p-4 rounded-3xl border border-white/5 h-48 font-mono text-[9px] overflow-hidden">
                <div className="text-cyan-500/50 mb-2 uppercase border-b border-white/5 pb-1">System Log</div>
                <div className="space-y-1">
                    {logs.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-slate-600">[{log.time}]</span>
                        <span className="text-slate-300">{log.msg}</span>
                      </div>
                    ))}
                </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-[#0f1113] rounded-[3.5rem] p-6 border border-white/5 flex justify-center items-center shadow-2xl relative min-h-[450px]">
              <JoystickController onMove={handleJoystickMove} disabled={!isPowered || isEmergencyStop} />
          </div>

          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="bg-[#0f1113] rounded-[2.5rem] p-8 border border-white/5 flex flex-col items-center gap-8 shadow-xl">
               <TrackMotors 
                 leftValue={leftTrack} 
                 rightValue={rightTrack} 
                 onLeftChange={setLeftTrack}    
                 onRightChange={setRightTrack}  
                 disabled={!isPowered || isEmergencyStop} 
               />
               <div className="flex gap-4">
                  <PowerToggle isOn={isPowered} onToggle={() => setIsPowered(!isPowered)} />
                  <StairModeToggle isActive={isStairMode} onToggle={() => setIsStairMode(!isStairMode)} disabled={!isPowered || isEmergencyStop} />
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;