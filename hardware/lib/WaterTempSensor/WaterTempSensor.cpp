#include "WaterTempSensor.h"
#include <TelnetStream.h>

WaterTempSensor::WaterTempSensor(uint8_t pin) : _pin(pin), _oneWire(pin), _sensors(&_oneWire) {
    _lastTemp = -127.0; // Default error value
    _lastRequestTime = 0;
    _requestPending = false;
}

void WaterTempSensor::begin() {
    _sensors.begin();
    // CRITICAL: This stops the sensor from pausing the Arduino during reads
    _sensors.setWaitForConversion(false); 
    Serial.println("[SYSTEM] DS18B20 Water Temp Sensor Initialized (Async Mode).");
    TelnetStream.println("[SYSTEM] DS18B20 Water Temp Sensor Initialized (Async Mode).");
}

void WaterTempSensor::update() {
    unsigned long currentMillis = millis();

    // 1. Tell the sensor to start measuring the temperature
    if (!_requestPending && (currentMillis - _lastRequestTime >= READ_INTERVAL)) {
        _sensors.requestTemperatures();
        _lastRequestTime = currentMillis;
        _requestPending = true;
    }

    // 2. Wait 750ms for the conversion to finish, THEN pull the data
    if (_requestPending && (currentMillis - _lastRequestTime >= 750)) {
        float temp = _sensors.getTempCByIndex(0);
        
        if (temp != DEVICE_DISCONNECTED_C && temp != 85.0) {
            _lastTemp = temp;
        } else {
            Serial.println("[WARNING] DS18B20 disconnected or read error.");
            TelnetStream.println("[WARNING] DS18B20 disconnected or read error.");
        }
        _requestPending = false; // Reset the cycle
    }
}

float WaterTempSensor::getWaterTemp() {
    return _lastTemp;
}
