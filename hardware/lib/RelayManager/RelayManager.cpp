#include "RelayManager.h"
#include <TelnetStream.h>

RelayManager::RelayManager(uint8_t pinLight, uint8_t pinIntake, uint8_t pinOuttake, uint8_t pinAir, uint8_t pinAgitator)
    : _pinLight(pinLight), _pinIntake(pinIntake), _pinOuttake(pinOuttake), _pinAir(pinAir), _pinAgitator(pinAgitator) {
    _lightOn = false;
    _intakeOn = false;
    _outtakeOn = false;
    _airOn = false;
    _agitatorOn = false;

    // Default Hardware Configuration:
    // Grow Lights (Pin 32) is Active-HIGH (single-channel replacement)
    // All other 4 channels on the 2-channel relay boards + SSR are Active-LOW
    _lightActiveHigh = true;
    _intakeActiveHigh = false;
    _outtakeActiveHigh = false;
    _airActiveHigh = false;
    _agitatorActiveHigh = false;
}

void RelayManager::begin() {
    pinMode(_pinLight, OUTPUT);
    pinMode(_pinIntake, OUTPUT);
    pinMode(_pinOuttake, OUTPUT);
    pinMode(_pinAir, OUTPUT);
    pinMode(_pinAgitator, OUTPUT);

    stopAll(); // Ensure everything is OFF at boot
    Serial.println("[SYSTEM] Relay Manager Initialized (Configurable Polarity).");
    TelnetStream.println("[SYSTEM] Relay Manager Initialized.");
}

void RelayManager::setPolarity(bool lightActiveHigh, bool intakeActiveHigh, bool outtakeActiveHigh, bool airActiveHigh, bool agitatorActiveHigh) {
    _lightActiveHigh = lightActiveHigh;
    _intakeActiveHigh = intakeActiveHigh;
    _outtakeActiveHigh = outtakeActiveHigh;
    _airActiveHigh = airActiveHigh;
    _agitatorActiveHigh = agitatorActiveHigh;
}

void RelayManager::setRelay(uint8_t pin, bool turnOn) {
    bool activeHigh = false;
    if (pin == _pinLight) activeHigh = _lightActiveHigh;
    else if (pin == _pinIntake) activeHigh = _intakeActiveHigh;
    else if (pin == _pinOuttake) activeHigh = _outtakeActiveHigh;
    else if (pin == _pinAir) activeHigh = _airActiveHigh;
    else if (pin == _pinAgitator) activeHigh = _agitatorActiveHigh;
    
    if (activeHigh) {
        digitalWrite(pin, turnOn ? HIGH : LOW);
    } else {
        digitalWrite(pin, turnOn ? LOW : HIGH);
    }
}

void RelayManager::setLight(bool state) {
    _lightOn = state;
    setRelay(_pinLight, state);
}

void RelayManager::setIntake(bool state) {
    _intakeOn = state;
    setRelay(_pinIntake, state);
}

void RelayManager::setOuttake(bool state) {
    _outtakeOn = state;
    setRelay(_pinOuttake, state);
}

void RelayManager::setAir(bool state) {
    _airOn = state;
    setRelay(_pinAir, state);
}

void RelayManager::setAgitator(bool state) {
    _agitatorOn = state;
    setRelay(_pinAgitator, state);
}

void RelayManager::stopAll() {
    setLight(false);
    setIntake(false);
    setOuttake(false);
    setAir(false);
    setAgitator(false);
}
