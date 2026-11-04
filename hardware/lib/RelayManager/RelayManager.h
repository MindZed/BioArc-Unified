#ifndef RELAY_MANAGER_H
#define RELAY_MANAGER_H

#include <Arduino.h>

class RelayManager {
public:
    // Pass the actual GPIO pins used in the hardware
    RelayManager(uint8_t pinLight, uint8_t pinIntake, uint8_t pinOuttake, uint8_t pinAir, uint8_t pinAgitator, uint8_t pinFan = 23);
    
    void begin();
    
    // Setters for individual relays
    void setLight(bool state);
    void setIntake(bool state);
    void setOuttake(bool state);
    void setAir(bool state);
    void setAgitator(bool state);
    void setExhaustFan(bool state);

    // Turn everything off (useful for HAZARD or manual stop)
    void stopAll();

    // Optional dynamic polarity configuration
    void setPolarity(bool lightActiveHigh, bool intakeActiveHigh = false, bool outtakeActiveHigh = false, bool airActiveHigh = false, bool agitatorActiveHigh = false, bool fanActiveHigh = false);

    // Getters for telemetry
    bool isLightOn() const { return _lightOn; }
    bool isIntakeOn() const { return _intakeOn; }
    bool isOuttakeOn() const { return _outtakeOn; }
    bool isAirOn() const { return _airOn; }
    bool isAgitatorOn() const { return _agitatorOn; }
    bool isExhaustFanOn() const { return _fanOn; }
    bool isAirActiveHigh() const { return _airActiveHigh; }
    void setAirActiveHigh(bool high) { _airActiveHigh = high; setRelay(_pinAir, _airOn); }

private:
    uint8_t _pinLight, _pinIntake, _pinOuttake, _pinAir, _pinAgitator, _pinFan;
    bool _lightOn, _intakeOn, _outtakeOn, _airOn, _agitatorOn, _fanOn;
    bool _lightActiveHigh, _intakeActiveHigh, _outtakeActiveHigh, _airActiveHigh, _agitatorActiveHigh, _fanActiveHigh;
    
    // Helper function to handle polarity.
    void setRelay(uint8_t pin, bool turnOn);
};

#endif
