#ifndef RELAY_MANAGER_H
#define RELAY_MANAGER_H

#include <Arduino.h>

class RelayManager {
public:
    // Pass the actual GPIO pins used in the hardware
    RelayManager(uint8_t pinLight, uint8_t pinIntake, uint8_t pinOuttake, uint8_t pinAir, uint8_t pinAgitator);
    
    void begin();
    
    // Setters for individual relays
    void setLight(bool state);
    void setIntake(bool state);
    void setOuttake(bool state);
    void setAir(bool state);
    void setAgitator(bool state);

    // Turn everything off (useful for HAZARD or manual stop)
    void stopAll();

    // Optional dynamic polarity configuration
    void setPolarity(bool lightActiveHigh, bool intakeActiveHigh = false, bool outtakeActiveHigh = false, bool airActiveHigh = false, bool agitatorActiveHigh = false);

    // Getters for telemetry
    bool isLightOn() const { return _lightOn; }
    bool isIntakeOn() const { return _intakeOn; }
    bool isOuttakeOn() const { return _outtakeOn; }
    bool isAirOn() const { return _airOn; }
    bool isAgitatorOn() const { return _agitatorOn; }

private:
    uint8_t _pinLight, _pinIntake, _pinOuttake, _pinAir, _pinAgitator;
    bool _lightOn, _intakeOn, _outtakeOn, _airOn, _agitatorOn;
    bool _lightActiveHigh, _intakeActiveHigh, _outtakeActiveHigh, _airActiveHigh, _agitatorActiveHigh;
    
    // Helper function to handle polarity.
    void setRelay(uint8_t pin, bool turnOn);
};

#endif
