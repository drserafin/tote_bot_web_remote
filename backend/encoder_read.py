import pigpio
import time

class EncoderReader:
    def __init__(self, pi, gpio_a, gpio_b, ppr=1993.6):
        self.pi = pi
        self.gpio_a = gpio_a
        self.gpio_b = gpio_b
        self.ppr = ppr
        
        self.count = 0
        self.last_count = 0
        self.last_time = time.time()
        self.current_rpm = 0

        # Set pull-ups (Internal 3.3v)
        self.pi.set_mode(gpio_a, pigpio.INPUT)
        self.pi.set_pull_up_down(gpio_a, pigpio.PUD_UP)
        self.pi.set_mode(gpio_b, pigpio.INPUT)
        self.pi.set_pull_up_down(gpio_b, pigpio.PUD_UP)

        # Monitor both edges of Channel A for higher resolution
        self.cb = self.pi.callback(gpio_a, pigpio.EITHER_EDGE, self._callback)

    def _callback(self, gpio, level, tick):
        # Determine direction using Channel B
        level_b = self.pi.read(self.gpio_b)
        if level == level_b:
            self.count -= 1
        else:
            self.count += 1

    def calculate_speed(self):
        """ Returns current RPM based on delta Ticks """
        now = time.time()
        dt = now - self.last_time
        if dt <= 0: return 0

        delta_ticks = self.count - self.last_count
        
        # RPM Calculation: (Ticks / PPR) * (60s / dt)
        self.current_rpm = (delta_ticks / self.ppr) * (60.0 / dt)
        
        self.last_count = self.count
        self.last_time = now
        return self.current_rpm

    def get_count(self):
        return self.count