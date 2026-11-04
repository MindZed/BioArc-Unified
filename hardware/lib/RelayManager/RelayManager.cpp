#include "RelayManager.h"
#include <TelnetStream.h>

RelayManager::RelayManager(uint8_t pinLight, uint8_t pinIntake, uint8_t pinOuttake, uint8_t pinAir, uint8_t pinAgitator, uint8_t pinFan)
    : _pinLight(pinLight), _pinIntake(pinIntake), _pinOuttake(pinOuttake), _pinAir(pinAir), _pinAgitator(pinAgitator), _pinFan(pinFan) {
    _lightOn = false;
    _intakeOn = false;
    _outtakeOn = false;
    _airOn = false;
    _agitatorOn = false;
    _fanOn = false;

    // Hardware Relay Polarities:
    // Pin 32 (Harvest Pump) is on the single-channel replacement module (Active-HIGH)
    // Pin 25 (Aeration Air Sparger) is on the Solid State Relay (Active-HIGH)
    // Pin 27 (Grow Lights) is on the multi-channel relay module (Active-LOW)
    // All other relay channels (Pins 33, 26, 23) are Active-LOW
    _lightActiveHigh = false;
    _intakeActiveHigh = false;
    _outtakeActiveHigh = true;
    _airActiveHigh = true;
    _agitatorActiveHigh = false;
    _fanActiveHigh = false;
}

void RelayManager::begin() {
    pinMode(_pinLight, OUTPUT);
    pinMode(_pinIntake, OUTPUT);
    pinMode(_pinOuttake, OUTPUT);
    pinMode(_pinAir, OUTPUT);
    pinMode(_pinAgitator, OUTPUT);
    pinMode(_pinFan, OUTPUT);

    stopAll(); // Ensure everything is OFF at boot
    Serial.println("[SYSTEM] Relay Manager Initialized (6 Channels with Exhaust Fan).");
    TelnetStream.println("[SYSTEM] Relay Manager Initialized (6 Channels with Exhaust Fan).");
}

void RelayManager::setPolarity(bool lightActiveHigh, bool intakeActiveHigh, bool outtakeActiveHigh, bool airActiveHigh, bool agitatorActiveHigh, bool fanActiveHigh) {
    _lightActiveHigh = lightActiveHigh;
    _intakeActiveHigh = intakeActiveHigh;
    _outtakeActiveHigh = outtakeActiveHigh;
    _airActiveHigh = airActiveHigh;
    _agitatorActiveHigh = agitatorActiveHigh;
    _fanActiveHigh = fanActiveHigh;
}

void RelayManager::setRelay(uint8_t pin, bool turnOn) {
    bool activeHigh = false;
    if (pin == _pinLight) activeHigh = _lightActiveHigh;
    else if (pin == _pinIntake) activeHigh = _intakeActiveHigh;
    else if (pin == _pinOuttake) activeHigh = _outtakeActiveHigh;
    else if (pin == _pinAir) activeHigh = _airActiveHigh;
    else if (pin == _pinAgitator) activeHigh = _agitatorActiveHigh;
    else if (pin == _pinFan) activeHigh = _fanActiveHigh;
    
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

void RelayManager::setExhaustFan(bool state) {
    _fanOn = state;
    setRelay(_pinFan, state);
}

void RelayManager::stopAll() {
    setLight(false);
    setIntake(false);
    setOuttake(false);
    setAir(false);
    setAgitator(false);
    setExhaustFan(false);
}
