#include "EnvironmentSensor.h"
#include <TelnetStream.h>

EnvironmentSensor::EnvironmentSensor() {
    _lastTemp = 0.0;
    _lastHum = 0.0;
    _lastPress = 0.0;
    _lastReadTime = 0;
}

void EnvironmentSensor::begin(uint8_t i2cAddress) {
    if (!_bme.begin(i2cAddress) && !_bme.begin(0x77)) {
        Serial.println("[CRITICAL] Could not find a valid BME280 sensor, check wiring!");
        TelnetStream.println("[CRITICAL] Could not find a valid BME280 sensor, check wiring!");
    } else {
        Serial.println("[SYSTEM] BME280 Environment Sensor Initialized.");
        TelnetStream.println("[SYSTEM] BME280 Environment Sensor Initialized.");
    }
}

void EnvironmentSensor::update() {
    unsigned long currentMillis = millis();

    if (currentMillis - _lastReadTime >= READ_INTERVAL) {
        _lastReadTime = currentMillis;

        float h = _bme.readHumidity();
        float t = _bme.readTemperature();
        float p = _bme.readPressure() / 100.0F;

        // Only update if the read was successful (not NaN)
        if (!isnan(h) && !isnan(t) && !isnan(p)) {
            _lastHum = h;
            _lastTemp = t;
            _lastPress = p;
        } else {
            Serial.println("[WARNING] BME280 Read Failure.");
            TelnetStream.println("[WARNING] BME280 Read Failure.");
        }
    }
}

float EnvironmentSensor::getAirTemp() {
    return _lastTemp;
}

float EnvironmentSensor::getHumidity() {
    return _lastHum;
}

float EnvironmentSensor::getPressure() {
    return _lastPress;
}
