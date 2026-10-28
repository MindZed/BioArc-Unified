#ifndef TIME_MANAGER_H
#define TIME_MANAGER_H

#include <Arduino.h>
#include <RTClib.h>

class TimeManager
{
public:
    TimeManager();

    bool begin();
    
    // Configures NTP and sets a background sync flag
    void setupNTP(const char* ntpServer = "pool.ntp.org", long gmtOffset_sec = 19800, int daylightOffset_sec = 0);
    
    // Should be called periodically in the main loop to check if NTP sync finished and to keep RTC aligned
    void update(); 

    void printTime();

    uint8_t getHour();
    uint8_t getMinute();
    
    String getFormattedTime();

private:
    RTC_DS3231 _rtc;
    bool _ntpConfigured;
    bool _rtcSyncedWithNTP;
    unsigned long _lastPrint;
    unsigned long _lastNTPCheck;
};

#endif
