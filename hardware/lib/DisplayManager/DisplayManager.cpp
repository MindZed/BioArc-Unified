#include "DisplayManager.h"

DisplayManager::DisplayManager(uint8_t oled_addr, uint8_t unused) 
    : _u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE) {
    _i2cAddress = (oled_addr == 0x27 || oled_addr == 0x25) ? 0x3C : oled_addr;
    _lastUpdate = 0;
    _lastPageFlip = 0;
    _pageA = true;
    _devMode = false;
    _rawDistCm = 0;
    _fanOn = false;
    _state = "BOOT";
    _ip = "0.0.0.0";
    _wifiStatus = false;
    _mqttStatus = false;
    _waterTemp = 0.0f;
    _ambTemp = 0.0f;
    _humidity = 0.0f;
    _waterLevel = 0;
    _timeStr = "00:00";
    _lightOn = false;
    _airOn = false;
    _intakeOn = false;
    _outtakeOn = false;
    _agitatorOn = false;
}

void DisplayManager::begin() {
    _u8g2.setI2CAddress(_i2cAddress * 2);
    _u8g2.begin();
    
    // Boot Splash
    _u8g2.clearBuffer();
    _u8g2.setFont(u8g2_font_helvB08_tf);
    _u8g2.drawStr(12, 22, "BioArc Ecosystem");
    _u8g2.drawHLine(12, 26, 104);
    _u8g2.setFont(u8g2_font_6x10_tf);
    _u8g2.drawStr(18, 42, "FreeRTOS Kernel");
    _u8g2.drawStr(24, 56, "Initializing...");
    _u8g2.sendBuffer();

    Serial.printf("[SYSTEM] 1.3\" OLED Display Initialized (Addr: 0x%02X).\n", _i2cAddress);
}

void DisplayManager::setSystemData(const char* state, String ip, bool wifiOk, bool mqttOk) {
    _state = state;
    String shortIp = ip;
    if (shortIp.startsWith("192.168.")) {
        shortIp = shortIp.substring(8); // e.g. "1.112"
    } else if (shortIp.startsWith("AP: 192.168.")) {
        shortIp = "AP:" + shortIp.substring(12);
    }
    _ip = shortIp;
    _wifiStatus = wifiOk;
    _mqttStatus = mqttOk;
}

void DisplayManager::setTelemetryData(float wTemp, float aTemp, float hum, int level, String timeStr) {
    _waterTemp = wTemp;
    _ambTemp = aTemp;
    _humidity = hum;
    _waterLevel = level;
    _timeStr = timeStr;
}

void DisplayManager::setDevData(bool devMode, int rawDistCm, bool fanOn) {
    _devMode = devMode;
    _rawDistCm = rawDistCm;
    _fanOn = fanOn;
}

void DisplayManager::setActuatorStates(bool light, bool air, bool intake, bool outtake, bool agitator, bool fan) {
    _lightOn = light;
    _airOn = air;
    _intakeOn = intake;
    _outtakeOn = outtake;
    _agitatorOn = agitator;
    _fanOn = fan;
}

void DisplayManager::drawStatusBar() {
    // Background bar & divider
    _u8g2.drawHLine(0, 11, 128);

    // State Badge (e.g. IDLE, AWAIT, DEV, HAZ)
    _u8g2.setFont(u8g2_font_5x7_tf);
    char stateTag[8];
    if (_devMode) {
        snprintf(stateTag, sizeof(stateTag), "DEV");
    } else {
        snprintf(stateTag, sizeof(stateTag), "%.5s", _state);
    }
    
    int tagWidth = _u8g2.getStrWidth(stateTag) + 4;
    _u8g2.drawBox(1, 1, tagWidth, 9);
    _u8g2.setDrawColor(0);
    _u8g2.drawStr(3, 8, stateTag);
    _u8g2.setDrawColor(1);

    // Time Clock
    _u8g2.setFont(u8g2_font_5x7_tf);
    _u8g2.drawStr(tagWidth + 6, 8, _timeStr.c_str());

    // Network Status Badges (WiFi / MQTT)
    int netX = 96;
    if (_wifiStatus) {
        _u8g2.drawStr(netX, 8, "W+");
    } else {
        _u8g2.drawStr(netX, 8, "W-");
    }
    if (_mqttStatus) {
        _u8g2.drawStr(netX + 16, 8, "M+");
    } else {
        _u8g2.drawStr(netX + 16, 8, "M-");
    }
}

void DisplayManager::drawTelemetryView() {
    char buf[32];

    // Line 1: Water Temp & Air Temp
    _u8g2.setFont(u8g2_font_6x10_tf);
    if (_waterTemp > -50.0f && _waterTemp < 100.0f) {
        snprintf(buf, sizeof(buf), "W:%.1fC", _waterTemp);
    } else {
        snprintf(buf, sizeof(buf), "W:ERR");
    }
    _u8g2.drawStr(2, 23, buf);

    if (_ambTemp > -50.0f && _ambTemp < 100.0f) {
        snprintf(buf, sizeof(buf), "A:%.1fC", _ambTemp);
    } else {
        snprintf(buf, sizeof(buf), "A:--");
    }
    _u8g2.drawStr(70, 23, buf);

    // Line 2: Water Level & Progress Bar
    snprintf(buf, sizeof(buf), "Lvl:%d%%", _waterLevel);
    _u8g2.drawStr(2, 36, buf);

    // Water level bar frame (x=50 to 125, y=28 to 36)
    _u8g2.drawFrame(52, 28, 74, 8);
    int fillWidth = constrain((_waterLevel * 70) / 100, 0, 70);
    if (fillWidth > 0) {
        _u8g2.drawBox(54, 30, fillWidth, 4);
    }

    // Line 3: Actuator Summary [L][A][P][F]
    _u8g2.setFont(u8g2_font_5x7_tf);
    snprintf(buf, sizeof(buf), "LGT:%s AIR:%s PMP:%s",
        _lightOn ? "ON" : "--",
        _airOn ? "ON" : "--",
        (_intakeOn || _outtakeOn) ? "ON" : "--"
    );
    _u8g2.drawStr(2, 49, buf);

    // Line 4: Exhaust Fan & IP Address
    snprintf(buf, sizeof(buf), "FAN:%s IP:%s",
        _fanOn ? "ON" : "--",
        _ip.c_str()
    );
    _u8g2.drawStr(2, 60, buf);
}

void DisplayManager::drawDevView() {
    char buf[32];

    _u8g2.setFont(u8g2_font_6x10_tf);
    _u8g2.drawStr(8, 23, "* DEV BENCH VIEW *");

    snprintf(buf, sizeof(buf), "Raw Dist: %d cm", _rawDistCm);
    _u8g2.drawStr(2, 36, buf);

    _u8g2.setFont(u8g2_font_5x7_tf);
    snprintf(buf, sizeof(buf), "Relays: In:%d Out:%d Air:%d", 
        _intakeOn ? 1 : 0, _outtakeOn ? 1 : 0, _airOn ? 1 : 0);
    _u8g2.drawStr(2, 48, buf);

    snprintf(buf, sizeof(buf), "Fan:%d Lgt:%d Agt:%d",
        _fanOn ? 1 : 0, _lightOn ? 1 : 0, _agitatorOn ? 1 : 0);
    _u8g2.drawStr(2, 59, buf);
}

void DisplayManager::drawHazardView() {
    _u8g2.drawBox(0, 0, 128, 14);
    _u8g2.setDrawColor(0);
    _u8g2.setFont(u8g2_font_helvB08_tf);
    _u8g2.drawStr(12, 11, "! SYSTEM HAZARD !");
    _u8g2.setDrawColor(1);

    _u8g2.setFont(u8g2_font_6x10_tf);
    _u8g2.drawStr(4, 30, "PUMPS HARD LOCKED");
    
    _u8g2.setFont(u8g2_font_5x7_tf);
    _u8g2.drawStr(4, 44, "Ultrasonic / Sensor fault");
    _u8g2.drawStr(4, 56, "Inspect chamber & logs");
}

void DisplayManager::update() {
    unsigned long currentMillis = millis();

    // Alternate views every PAGE_DURATION
    if (currentMillis - _lastPageFlip >= PAGE_DURATION) {
        _lastPageFlip = currentMillis;
        _pageA = !_pageA;
    }

    if (currentMillis - _lastUpdate < REFRESH_RATE) {
        return;
    }
    _lastUpdate = currentMillis;

    _u8g2.clearBuffer();

    // 1. Hazard State Override
    if (strcmp(_state, "HAZARD") == 0 || strcmp(_state, "!!! HAZARD !!!") == 0) {
        drawHazardView();
        _u8g2.sendBuffer();
        return;
    }

    // 2. Normal / Dev Views
    drawStatusBar();

    if (_devMode) {
        if (_pageA) {
            drawDevView();
        } else {
            drawTelemetryView();
        }
    } else {
        drawTelemetryView();
    }

    _u8g2.sendBuffer();
}
