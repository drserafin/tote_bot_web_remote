import motoron
import time

class DriveSystem:
    def __init__(self, dummy_mode=False):
        self.dummy_mode = dummy_mode
        self.mc = None
        self.voltage_type = None

        if not self.dummy_mode:
            try:
                self.mc = motoron.MotoronI2C()
                
                # --- SETUP FOR M2H18v20 ---
                self.mc.reinitialize()
                self.mc.clear_reset_flag()
                
                # Safety: Stop motors if Pi disconnects for > 1 second
                self.mc.set_error_response(motoron.ERROR_RESPONSE_COAST)
                self.mc.set_command_timeout_milliseconds(1000)

                # Configure Motors (M2H18v20 handles high current, so we can be aggressive)
                # Max Accel: 140 (Prevent wheelies) | Max Decel: 300 (Stop fast)
                for m in [1, 2]:
                    self.mc.set_max_acceleration(m, 140)
                    self.mc.set_max_deceleration(m, 300)
                
                self.mc.clear_motor_fault()
                
                # Try to find the correct M2H voltage type for accurate battery reading
                # If not found, it defaults to standard scaling (readings might be slightly off)
                if hasattr(motoron.VinSenseType, 'MOTORON_5054'): 
                    self.voltage_type = motoron.VinSenseType.MOTORON_5054
                elif hasattr(motoron.VinSenseType, 'MOTORON_H'):
                    self.voltage_type = motoron.VinSenseType.MOTORON_H
                else:
                    # Fallback to 256 (Movement still works, just voltage readout is off)
                    self.voltage_type = motoron.VinSenseType.MOTORON_256
                
                print(f"? Pololu Motoron M2H18v20 Initialized (Voltage Type: {self.voltage_type})")

            except Exception as e:
                print(f"?? Motoron Error: {e}")
                print("?? Switching to DUMMY MODE")
                self.dummy_mode = True

    def set_motors(self, left_percent, right_percent):
        """
        Input: -100 to 100 (from React)
        Output: -800 to 800 (Pololu native speed units)
        """
        # 1. Clamp Inputs (-100 to 100)
        left_percent = max(-100, min(100, int(left_percent)))
        right_percent = max(-100, min(100, int(right_percent)))

        # 2. Convert to Pololu Scale (-800 to 800)
        left_speed = int(left_percent * 8)
        right_speed = int(right_percent * 8)

        if self.dummy_mode:
            print(f"[DRIVE] Left: {left_speed} | Right: {right_speed}")
        else:
            try:
                self.mc.set_speed(1, left_speed) 
                self.mc.set_speed(2, right_speed)
            except OSError:
                print("?? I2C Error - Check Wires")
    
    def stop(self):
        if not self.dummy_mode:
            self.mc.set_speed(1, 0)
            self.mc.set_speed(2, 0)
    
    def get_voltage(self):
        if self.dummy_mode: return 0
        try:
            # 3300mV reference is standard for Raspberry Pi I2C logic
            return self.mc.get_vin_voltage_mv(3300, self.voltage_type)
        except:
            return 0

    def cleanup(self):
        self.stop()