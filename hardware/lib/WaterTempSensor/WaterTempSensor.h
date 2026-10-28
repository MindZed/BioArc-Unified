#ifndef WATER_TEMP_SENSOR_H
#define WATER_TEMP_SENSOR_H

#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>

class WaterTempSensor {
public:
    WaterTempSensor(uint8_t pin);
    void begin();
    void update(); // Handles the non-blocking read cycle
    float getWaterTemp(); // Returns the most recently fetched temperature

private:
    uint8_t _pin;
    OneWire _oneWire;
    DallasTemperature _sensors;
    
    float _lastTemp;
    unsigned long _lastRequestTime;
    bool _requestPending;
    
    const unsigned long READ_INTERVAL = 10000; // Ask for a new reading every 10 seconds
};

#endif
