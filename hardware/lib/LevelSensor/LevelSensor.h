#ifndef LEVEL_SENSOR_H
#define LEVEL_SENSOR_H

#include <Arduino.h>
#include <NewPing.h>

class LevelSensor {
public:
    LevelSensor(uint8_t triggerPin, uint8_t echoPin, unsigned int maxDistCm = 100);
    void begin();
    void update(); 
    
    int getDistanceCM();
    bool isFaulty(); // Failsafe check

private:
    NewPing _sonar;
    unsigned long _lastPingTime;
    
    static const int NUM_READINGS = 10;
    int _readings[NUM_READINGS];
    int _readIndex;
    int _total;
    int _average;
    
    int _consecutiveZeros; // Tracks dead pings
};

#endif
