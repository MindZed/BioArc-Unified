#include "TimeManager.h"
#include <Wire.h>
#include <time.h>
#include <TelnetStream.h>

TimeManager::TimeManager()
{
    _lastPrint = 0;
    _lastNTPCheck = 0;
    _ntpConfigured = false;
    _rtcSyncedWithNTP = false;
}

bool TimeManager::begin()
{
    if (!_rtc.begin())
    {
        return false;
    }
    // If the RTC lost power, set it to compile time just as a fallback
    if (_rtc.lostPower()) {
        _rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    }
    Serial.println("[SYSTEM] RTC Module Initialized.");
    TelnetStream.println("[SYSTEM] RTC Module Initialized.");
    return true;
}

void TimeManager::setupNTP(const char* ntpServer, long gmtOffset_sec, int daylightOffset_sec)
{
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
    _ntpConfigured = true;
    _rtcSyncedWithNTP = false;
    Serial.println("[SYSTEM] NTP Sync requested in background.");
    TelnetStream.println("[SYSTEM] NTP Sync requested in background.");
}

void TimeManager::update()
{
    // Try to sync RTC with NTP if configured but not yet synced
    if (_ntpConfigured && !_rtcSyncedWithNTP && (millis() - _lastNTPCheck > 5000)) {
        _lastNTPCheck = millis();
        struct tm timeinfo;
        if (getLocalTime(&timeinfo, 10)) { // 10ms timeout so we don't block
            // NTP sync successful! Adjust RTC.
            _rtc.adjust(DateTime(timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday, 
                                 timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec));
            _rtcSyncedWithNTP = true;
            Serial.println("[SUCCESS] RTC synchronized with NTP Server!");
            TelnetStream.println("[SUCCESS] RTC synchronized with NTP Server!");
        }
    }
}

void TimeManager::printTime()
{
    unsigned long currentMillis = millis();
    if (currentMillis - _lastPrint >= 1000)
    {
        _lastPrint = currentMillis;
        DateTime now = _rtc.now();
        
        char buffer[32];
        snprintf(buffer, sizeof(buffer), "RTC Time: %04d/%02d/%02d %02d:%02d:%02d", 
                 now.year(), now.month(), now.day(), now.hour(), now.minute(), now.second());
        
        Serial.println(buffer);
        TelnetStream.println(buffer);
    }
}

uint8_t TimeManager::getHour()
{
    return _rtc.now().hour();
}

uint8_t TimeManager::getMinute()
{
    return _rtc.now().minute();
}

String TimeManager::getFormattedTime()
{
    DateTime now = _rtc.now();
    char buffer[10];
    snprintf(buffer, sizeof(buffer), "%02d:%02d", now.hour(), now.minute());
    return String(buffer);
}
