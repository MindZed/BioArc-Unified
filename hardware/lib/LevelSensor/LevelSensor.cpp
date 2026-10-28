#include "LevelSensor.h"
#include <TelnetStream.h>

LevelSensor::LevelSensor(uint8_t triggerPin, uint8_t echoPin, unsigned int maxDistCm) 
    : _sonar(triggerPin, echoPin, maxDistCm) {
    _lastPingTime = 0;
    _readIndex = 0; _total = 0; _average = 0;
    _consecutiveZeros = 0; // Initialize at 0
    for (int i = 0; i < NUM_READINGS; i++) _readings[i] = 0;
}

void LevelSensor::begin() {
    Serial.println("[SYSTEM] Ultrasonic Level Sensor Initialized.");
    TelnetStream.println("[SYSTEM] Ultrasonic Level Sensor Initialized.");
}

void LevelSensor::update() {
    // Ping every 50ms (non-blocking)
    if (millis() - _lastPingTime >= 50) {
        _lastPingTime = millis();
        
        int currentDistance = _sonar.ping_cm();
        
        if (currentDistance > 0) {
            _consecutiveZeros = 0; // SUCCESS! Reset the fault counter
            
            _total = _total - _readings[_readIndex];
            _readings[_readIndex] = currentDistance;
            _total = _total + _readings[_readIndex];
            _readIndex = _readIndex + 1;
            
            if (_readIndex >= NUM_READINGS) _readIndex = 0;
            _average = _total / NUM_READINGS;
        } else {
            // FAILED PING: It read 0 (missed echo, out of range, or water touching sensor)
            _consecutiveZeros++; 
        }
    }
}

int LevelSensor::getDistanceCM() {
    return _average;
}

bool LevelSensor::isFaulty() {
    // 50ms per ping * 40 pings = 2 full seconds of dead zero readings.
    return (_consecutiveZeros > 40); 
}
