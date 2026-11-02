#include "TimeManager.h"
#include <Wire.h>
#include <time.h>
#include <TelnetStream.h>

TimeManager::TimeManager()
    : _cachedTime(DateTime(2026, 1, 1, 0, 0, 0))
{
    _hasRtc = false;
    _lastRtcRead = 0;
    _lastPrint = 0;
    _lastNTPCheck = 0;
    _ntpConfigured = false;
    _rtcSyncedWithNTP = false;
}

bool TimeManager::begin()
{
    _hasRtc = _rtc.begin();
    if (!_hasRtc)
    {
        Serial.println("[WARNING] DS3231 RTC Module not detected on I2C (0x68). Using ESP32 internal clock.");
        TelnetStream.println("[WARNING] DS3231 RTC Module not detected on I2C (0x68). Using ESP32 internal clock.");
        return false;
    }

    if (_rtc.lostPower()) {
        _rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    }
    _cachedTime = _rtc.now();
    _lastRtcRead = millis();
    Serial.println("[SYSTEM] DS3231 RTC Module Initialized.");
    TelnetStream.println("[SYSTEM] DS3231 RTC Module Initialized.");
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
    unsigned long currentMillis = millis();

    // 1. Try to sync RTC with NTP if configured but not yet synced
    if (_ntpConfigured && !_rtcSyncedWithNTP && (currentMillis - _lastNTPCheck > 5000)) {
        _lastNTPCheck = currentMillis;
        struct tm timeinfo;
        if (getLocalTime(&timeinfo, 10)) {
            if (_hasRtc) {
                _rtc.adjust(DateTime(timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday, 
                                     timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec));
            }
            _cachedTime = DateTime(timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday, 
                                   timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
            _rtcSyncedWithNTP = true;
            _lastRtcRead = currentMillis;
            Serial.println("[SUCCESS] RTC synchronized with NTP Server!");
            TelnetStream.println("[SUCCESS] RTC synchronized with NTP Server!");
            return;
        }
    }

    // 2. Read from internal RTC or DS3231 at most once every 1000ms (zero I2C bus flooding)
    if (currentMillis - _lastRtcRead >= 1000) {
        _lastRtcRead = currentMillis;
        struct tm timeinfo;
        if (getLocalTime(&timeinfo, 5)) {
            _cachedTime = DateTime(timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday, 
                                   timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
        } else if (_hasRtc) {
            _cachedTime = _rtc.now();
        } else {
            // Advance cached time by elapsed seconds
            _cachedTime = DateTime(_cachedTime.unixtime() + 1);
        }
    }
}

void TimeManager::printTime()
{
    unsigned long currentMillis = millis();
    if (currentMillis - _lastPrint >= 1000)
    {
        _lastPrint = currentMillis;
        char buffer[32];
        snprintf(buffer, sizeof(buffer), "RTC Time: %04d/%02d/%02d %02d:%02d:%02d", 
                 _cachedTime.year(), _cachedTime.month(), _cachedTime.day(), 
                 _cachedTime.hour(), _cachedTime.minute(), _cachedTime.second());
        
        Serial.println(buffer);
        TelnetStream.println(buffer);
    }
}

uint8_t TimeManager::getHour()
{
    return _cachedTime.hour();
}

uint8_t TimeManager::getMinute()
{
    return _cachedTime.minute();
}

String TimeManager::getFormattedTime()
{
    char buffer[10];
    snprintf(buffer, sizeof(buffer), "%02d:%02d", _cachedTime.hour(), _cachedTime.minute());
    return String(buffer);
}
