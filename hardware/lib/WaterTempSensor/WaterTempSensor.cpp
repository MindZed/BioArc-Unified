#include "WaterTempSensor.h"
#include <TelnetStream.h>

WaterTempSensor::WaterTempSensor(uint8_t pin) : _pin(pin), _oneWire(pin), _sensors(&_oneWire) {
    _lastTemp = -127.0; // Default error value
    _lastRequestTime = 0;
    _requestPending = false;
}

void WaterTempSensor::begin() {
    pinMode(_pin, INPUT_PULLUP); // Enable ESP32 internal pull-up as assistance
    _sensors.begin();
    _sensors.setWaitForConversion(false); 
    uint8_t count = _sensors.getDeviceCount();
    Serial.printf("[SYSTEM] DS18B20 Water Temp Sensor Initialized (Async Mode, %d device(s) on Pin %d).\n", count, _pin);
    TelnetStream.printf("[SYSTEM] DS18B20 Water Temp Sensor Initialized (Async Mode, %d device(s) on Pin %d).\n", count, _pin);
}

bool WaterTempSensor::hasPresence() {
    return _oneWire.reset() == 1;
}

uint8_t WaterTempSensor::getDeviceCount() {
    return _sensors.getDeviceCount();
}

void WaterTempSensor::reinit() {
    pinMode(_pin, INPUT_PULLUP);
    _sensors.begin();
    _sensors.setWaitForConversion(false);
}

void WaterTempSensor::update() {
    unsigned long currentMillis = millis();

    // If no devices were found yet, try re-discovering every 3 seconds
    if (_sensors.getDeviceCount() == 0) {
        if (currentMillis - _lastRequestTime >= 3000) {
            _lastRequestTime = currentMillis;
            if (_oneWire.reset() == 1) {
                _sensors.begin();
                _sensors.setWaitForConversion(false);
                if (_sensors.getDeviceCount() > 0) {
                    Serial.println("[SYSTEM] DS18B20 hot-plug detected! Devices found.");
                    TelnetStream.println("[SYSTEM] DS18B20 hot-plug detected! Devices found.");
                }
            }
        }
        return;
    }

    // 1. Tell the sensor to start measuring the temperature
    if (!_requestPending && (currentMillis - _lastRequestTime >= READ_INTERVAL)) {
        _sensors.requestTemperatures();
        _lastRequestTime = currentMillis;
        _requestPending = true;
    }

    // 2. Wait 750ms for the conversion to finish, THEN pull the data
    if (_requestPending && (currentMillis - _lastRequestTime >= 750)) {
        float temp = _sensors.getTempCByIndex(0);
        
        if (temp != DEVICE_DISCONNECTED_C && temp != 85.0 && temp > -50.0f && temp < 85.0f) {
            _lastTemp = temp;
        } else {
            Serial.println("[WARNING] DS18B20 disconnected or read error.");
            TelnetStream.println("[WARNING] DS18B20 disconnected or read error.");
            if (_oneWire.reset() != 1) {
                _lastTemp = -127.0f;
            }
        }
        _requestPending = false; // Reset the cycle
    }
}

float WaterTempSensor::getWaterTemp() {
    return _lastTemp;
}
