#include "DisplayManager.h"

DisplayManager::DisplayManager(uint8_t lcd1_addr, uint8_t lcd2_addr) 
    : _lcdStatus(lcd1_addr, 16, 2), _lcdTelemetry(lcd2_addr, 16, 2) {
    _lastUpdate = 0;
    _lastPageFlip = 0;
    _pageA = true;
    _state = "BOOTING";
    _ip = "0.0.0.0";
    _wifiStatus = false; _mqttStatus = false;
    _waterTemp = 0.0; _ambTemp = 0.0; _humidity = 0.0;
    _waterLevel = 0;
    _timeStr = "00:00";
}

void DisplayManager::begin() {
    _lcdStatus.init();
    _lcdStatus.backlight();
    
    _lcdTelemetry.init();
    _lcdTelemetry.backlight();
    
    printPadded(_lcdStatus, "BioArc OS", 0);
    printPadded(_lcdStatus, "Booting...", 1);
    
    printPadded(_lcdTelemetry, "Sensors init", 0);
    printPadded(_lcdTelemetry, "Please wait", 1);
    
    Serial.println("[SYSTEM] Dual LCDs Initialized (Paginated).");
}

void DisplayManager::setSystemData(const char* state, String ip, bool wifiOk, bool mqttOk) {
    _state = state;
    String shortIp = ip;
    if (shortIp.startsWith("192.168.")) {
        shortIp = shortIp.substring(8); // e.g. "1.112"
    } else if (shortIp.startsWith("AP: 192.168.")) {
        shortIp = "AP:" + shortIp.substring(12); // e.g. "AP:4.1"
    } else {
        int firstDot = shortIp.indexOf('.');
        int secondDot = (firstDot != -1) ? shortIp.indexOf('.', firstDot + 1) : -1;
        if (secondDot != -1 && secondDot < shortIp.length() - 1) {
            shortIp = shortIp.substring(secondDot + 1);
        }
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

void DisplayManager::printPadded(LiquidCrystal_I2C& lcd, const char* text, int row) {
    char buffer[17]; 
    snprintf(buffer, sizeof(buffer), "%-16s", text); 
    lcd.setCursor(0, row);
    lcd.print(buffer);
}

void DisplayManager::update() {
    unsigned long currentMillis = millis();

    // Handle Page Flipping
    if (currentMillis - _lastPageFlip >= PAGE_DURATION) {
        _lastPageFlip = currentMillis;
        _pageA = !_pageA; // Flip page
    }

    // Handle Screen Refresh
    if (currentMillis - _lastUpdate >= REFRESH_RATE) {
        _lastUpdate = currentMillis;
        char lineBuffer[17];
        
        // HAZARD OVERRIDE
        if (strcmp(_state, "HAZARD") == 0 || strcmp(_state, "!!! HAZARD !!!") == 0) {
            printPadded(_lcdStatus, "!!! HAZARD !!!", 0);
            printPadded(_lcdStatus, "SYSTEM HALTED!", 1);
            printPadded(_lcdTelemetry, "CHECK SENSORS", 0);
            printPadded(_lcdTelemetry, "CHECK PUMPS", 1);
            
            // Blink backlight for hazard
            if ((currentMillis / 500) % 2 == 0) {
                setBacklight(true);
            } else {
                setBacklight(false);
            }
            return; // Skip normal rendering
        } else {
            setBacklight(true); // Ensure backlight is on if not in hazard
        }

        // --- LCD 1: SYSTEM STATUS & NETWORK ---
        if (_pageA) {
            snprintf(lineBuffer, sizeof(lineBuffer), "Sys: %s", _state);
            printPadded(_lcdStatus, lineBuffer, 0);
            snprintf(lineBuffer, sizeof(lineBuffer), "IP: %s", _ip.c_str());
            printPadded(_lcdStatus, lineBuffer, 1);
        } else {
            snprintf(lineBuffer, sizeof(lineBuffer), "WiFi: %s", _wifiStatus ? "Connected" : "Offline");
            printPadded(_lcdStatus, lineBuffer, 0);
            snprintf(lineBuffer, sizeof(lineBuffer), "MQTT: %s", _mqttStatus ? "Online" : "Offline");
            printPadded(_lcdStatus, lineBuffer, 1);
        }

        // --- LCD 2: TELEMETRY & ENVIRONMENT ---
        char wStr[6], aStr[6], hStr[6];
        dtostrf(_waterTemp, 4, 1, wStr); 
        dtostrf(_ambTemp, 4, 1, aStr);
        dtostrf(_humidity, 3, 0, hStr);

        if (_pageA) {
            snprintf(lineBuffer, sizeof(lineBuffer), "Water: %sC", wStr);
            printPadded(_lcdTelemetry, lineBuffer, 0);
            snprintf(lineBuffer, sizeof(lineBuffer), "Air: %sC %s%%", aStr, hStr);
            printPadded(_lcdTelemetry, lineBuffer, 1);
        } else {
            snprintf(lineBuffer, sizeof(lineBuffer), "Level: %d cm", _waterLevel);
            printPadded(_lcdTelemetry, lineBuffer, 0);
            snprintf(lineBuffer, sizeof(lineBuffer), "Time: %s", _timeStr.c_str());
            printPadded(_lcdTelemetry, lineBuffer, 1);
        }
    }
}

void DisplayManager::setBacklight(bool state) {
    if (state) {
        _lcdStatus.backlight();
        _lcdTelemetry.backlight();
    } else {
        _lcdStatus.noBacklight();
        _lcdTelemetry.noBacklight();
    }
}
