import motoron

class DriveSystem:
    def __init__(self, dummy_mode=False):
        self.dummy_mode = dummy_mode
        self.mc = None
        self.voltage_type = None

        if not self.dummy_mode:
            try:
                # Initialize Pololu Motoron
                self.mc = motoron.MotoronI2C()
                self.mc.reinitialize()
                self.mc.clear_reset_flag()
                
                # Safety: Stop if connection lost for 1s
                self.mc.set_error_response(motoron.ERROR_RESPONSE_COAST)
                self.mc.set_command_timeout_milliseconds(1000)

                # Configure Motors (M1=Left, M2=Right)

                self.mc.set_max_acceleration(1, 140)
                self.mc.set_max_deceleration(1, 300)
                
                self.mc.set_max_acceleration(2, 140)
                self.mc.set_max_deceleration(2, 300)
                
                self.mc.clear_motor_fault()
                
                # Voltage sensing type
                if hasattr(motoron.VinSenseType, 'MOTORON_5054'): 
                    self.voltage_type = motoron.VinSenseType.MOTORON_5054
                else:
                    self.voltage_type = motoron.VinSenseType.MOTORON_H
                
                print("✔ Motoron Hardware Initialized")
            except Exception as e:
                print(f"❌ Hardware Error: {e}")
                self.dummy_mode = True

    def set_motors(self, left_percent, right_percent):
        """ Scales -100/100 to -800/800 """
        l_speed = int(max(-100, min(100, left_percent)) * 8)
        r_speed = int(max(-100, min(100, right_percent)) * 8)

        if self.dummy_mode:
            print(f"[DRIVE] L: {l_speed} | R: {r_speed}")
        else:
            try:
                self.mc.set_speed(1, l_speed) 
                self.mc.set_speed(2, r_speed)
            except OSError:
                print("🚨 I2C Connection Lost")
    
    def stop(self):
        self.set_motors(0, 0)

    def get_voltage(self):
        if self.dummy_mode: return 12500
        try:
            return self.mc.get_vin_voltage_mv(3300, self.voltage_type)
        except:
            return 0

    def cleanup(self):
        self.stop()