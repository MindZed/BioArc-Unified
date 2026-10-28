#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <ESPmDNS.h>
#include <ArduinoOTA.h>
#include <TelnetStream.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>
#include <rom/rtc.h>

// --- FreeRTOS Includes ---
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"
#include "freertos/queue.h"
#include "freertos/event_groups.h"

// --- Custom Domain Libraries ---
#include "TimeManager.h"
#include "WaterTempSensor.h"
#include "EnvironmentSensor.h"
#include "LevelSensor.h"
#include "DisplayManager.h"
#include "RelayManager.h"
#include "MqttManager.h"
#include "ColorSensor.h"
#include "CaptivePortal.h"

#define WDT_TIMEOUT 30 // 30 seconds hardware watchdog

// ==========================================
// GPIO PIN ASSIGNMENTS & HARDWARE CONSTANTS
// ==========================================
#define I2C_SDA 21
#define I2C_SCL 22

#define ONE_WIRE_BUS 4
#define TRIG_PIN 18
#define ECHO_PIN 19

#define RELAY_INTAKE 33     // Active-LOW (Intake Solenoid)
#define RELAY_LIGHT 32      // Active-HIGH (Grow Lights replacement module)
#define SSR1_AIR_PUMP 25    // Active-LOW (Aeration Sparger)
#define RELAY_OUTTAKE 26    // Active-LOW (Harvest Drain)
#define RELAY_AGITATOR 27   // Active-LOW (Agitator Motor)

// Tank Distance Calibrations (cm)
const int DIST_EMPTY = 33;
const int DIST_FULL = 8;
const int DIST_REFILL_TRIG = 4;

// ==========================================
// FSM STATES
// ==========================================
enum FSM_State {
    STATE_AWAITING_COMMISSION,
    STATE_COMMISSION_FILL,
    STATE_IDLE,
    STATE_AGITATING,
    STATE_REFILL,
    STATE_HARVEST,
    STATE_HAZARD,
    STATE_MANUAL_OVERRIDE
};

const char* stateNames[] = {"AWAIT", "COMM_FILL", "IDLE", "AGITATING", "REFILL", "HARVEST", "HAZARD", "MANUAL"};

// ==========================================
// SYSTEM METRICS & CONFIGURATION
// ==========================================
Preferences preferences;
Preferences netPreferences;

struct SysConfig {
    uint8_t lightOnHr;
    uint8_t lightOffHr;
    bool enableLights;
    bool enableAir;
    bool enableAgitator;
    bool enableAutoRefill;
    uint8_t fillPct;
    float chlCalibK;
    float harvestOD;
    float crashDeltaOD;
    uint16_t baseR, baseG, baseB, baseC;
} config;

struct NetworkConfig {
    String wifiSSID;
    String wifiPass;
    String mqttBroker;
    int mqttPort;
    String mqttUser;
    String mqttPass;
} netConfig;

int getEffectiveDistFull() {
    return DIST_EMPTY - ((DIST_EMPTY - DIST_FULL) * config.fillPct / 100);
}

void loadConfig() {
    preferences.begin("bioarc", false);
    config.lightOnHr = preferences.getUChar("lightOnHr", 8);
    config.lightOffHr = preferences.getUChar("lightOffHr", 20);
    config.enableLights = preferences.getBool("enLights", true);
    config.enableAir = preferences.getBool("enAir", true);
    config.enableAgitator = preferences.getBool("enAgitator", true);
    config.enableAutoRefill = preferences.getBool("enRefill", true);
    config.fillPct = preferences.getUChar("fillPct", 100);
    config.chlCalibK = preferences.getFloat("chlCalibK", 850.0f);
    config.harvestOD = preferences.getFloat("harvestOD", 1.5f);
    config.crashDeltaOD = preferences.getFloat("crashDOD", 0.5f);
    config.baseR = preferences.getUShort("baseR", 1500);
    config.baseG = preferences.getUShort("baseG", 1350);
    config.baseB = preferences.getUShort("baseB", 1450);
    config.baseC = preferences.getUShort("baseC", 4300);
    if (config.baseC == 0) {
        config.baseR = 1500; config.baseG = 1350; config.baseB = 1450; config.baseC = 4300;
    }
}

void saveConfig() {
    preferences.putUChar("lightOnHr", config.lightOnHr);
    preferences.putUChar("lightOffHr", config.lightOffHr);
    preferences.putBool("enLights", config.enableLights);
    preferences.putBool("enAir", config.enableAir);
    preferences.putBool("enAgitator", config.enableAgitator);
    preferences.putBool("enRefill", config.enableAutoRefill);
    preferences.putUChar("fillPct", config.fillPct);
    preferences.putFloat("chlCalibK", config.chlCalibK);
    preferences.putFloat("harvestOD", config.harvestOD);
    preferences.putFloat("crashDOD", config.crashDeltaOD);
    preferences.putUShort("baseR", config.baseR);
    preferences.putUShort("baseG", config.baseG);
    preferences.putUShort("baseB", config.baseB);
    preferences.putUShort("baseC", config.baseC);
}

void loadNetworkConfig() {
    netPreferences.begin("bioarc_net", false);
    netConfig.wifiSSID = netPreferences.getString("ssid", "seVen_Office");
    netConfig.wifiPass = netPreferences.getString("pass", "----____");
    netConfig.mqttBroker = netPreferences.getString("mqtt_host", "mqtt.mindzed.tech");
    netConfig.mqttPort = netPreferences.getInt("mqtt_port", 8883);
    netConfig.mqttUser = netPreferences.getString("mqtt_user", "bioarc_v2");
    netConfig.mqttPass = netPreferences.getString("mqtt_pass", "bioarc4_v2");
}

void saveNetworkConfig(const String& ssid, const String& pass, const String& mqttHost, int mqttPort, const String& mqttUser, const String& mqttPass) {
    netPreferences.begin("bioarc_net", false);
    netPreferences.putString("ssid", ssid);
    netPreferences.putString("pass", pass);
    netPreferences.putString("mqtt_host", mqttHost);
    netPreferences.putInt("mqtt_port", mqttPort);
    netPreferences.putString("mqtt_user", mqttUser);
    netPreferences.putString("mqtt_pass", mqttPass);
}

// ==========================================
// THREAD-SAFE SHARED TELEMETRY DATA
// ==========================================
struct TelemetrySnapshot {
    FSM_State state;
    float waterTemp;
    float airTemp;
    float humidity;
    float pressure;
    int distanceCM;
    bool intakeOn;
    bool outtakeOn;
    bool airOn;
    bool lightOn;
    bool agitatorOn;
    uint16_t tcsR, tcsG, tcsB, tcsC;
    float greenRatio;
    float grRatio;
    float pseudoOD;
    float vegIndex;
    float chlA;
    float growthRateMu;
    bool hasBaseline;
    bool isDaytime;
    uint8_t currentHr;
    uint8_t currentMin;
    bool wifiConnected;
    bool mqttConnected;
    String ipStr;
    String timeStr;
};

TelemetrySnapshot sharedTelemetry;

// ==========================================
// FREERTOS SYNCHRONIZATION PRIMITIVES
// ==========================================
SemaphoreHandle_t xI2CMutex = NULL;      // Guards shared I2C bus (BME280, TCS34725, Dual LCDs, RTC)
SemaphoreHandle_t xStateMutex = NULL;    // Guards shared telemetry data & SysConfig
QueueHandle_t xCommandQueue = NULL;      // Dispatches command actions to FSM task
EventGroupHandle_t xControlEvents = NULL; // Coordinates asynchronous sampling & telemetry events

#define EVENT_TRIGGER_OPTICAL_SAMPLE (1 << 0)
#define EVENT_FORCE_TELEMETRY        (1 << 1)
#define EVENT_CALIBRATE_BASELINE     (1 << 2)

// ==========================================
// HARDWARE DRIVERS & MANAGERS
// ==========================================
WiFiMulti wifiMulti;
TimeManager timeManager;
WaterTempSensor waterTemp(ONE_WIRE_BUS);
EnvironmentSensor envSensor;
LevelSensor waterLevel(TRIG_PIN, ECHO_PIN, 100);
DisplayManager displays(0x27, 0x25);
RelayManager relays(RELAY_LIGHT, RELAY_INTAKE, RELAY_OUTTAKE, SSR1_AIR_PUMP, RELAY_AGITATOR);
MqttManager mqtt;
ColorSensor colorSensor;
CaptivePortal portal;

// FSM Internal State Variables (Controlled by Task_FSM_Control)
FSM_State currentState = STATE_AWAITING_COMMISSION;
unsigned long actionStartTime = 0;
unsigned long pumpOvershootTimer = 0;
bool overshootActive = false;
int targetDistance = 0;
int lastAgitationHour = -1;
int lastAgitationMin = -1;
bool sensorsReady = false;
unsigned long systemReadyTime = 0;
String bootReasonStr = "";

// Demo Mode Tracking
bool demoMode = false;
uint8_t demoStep = 0;
unsigned long demoStepStart = 0;

// Optical Growth Rate Calculation
float previousOD = 0.0f;
unsigned long previousODTimestamp = 0;

// ==========================================
// HELPER FUNCTIONS
// ==========================================
String getResetReason(RESET_REASON reason) {
    switch (reason) {
        case 1: return "POWERON_RESET";
        case 3: return "SW_RESET";
        case 4: return "OWDT_RESET";
        case 5: return "DEEPSLEEP_RESET";
        case 6: return "SDIO_RESET";
        case 7: return "TG0WDT_SYS_RESET";
        case 8: return "TG1WDT_SYS_RESET";
        case 9: return "RTCWDT_SYS_RESET";
        case 10: return "INTRUSION_RESET";
        case 11: return "TGWDT_CPU_RESET";
        case 12: return "SW_CPU_RESET";
        case 13: return "RTCWDT_CPU_RESET";
        case 14: return "EXT_CPU_RESET";
        case 15: return "RTCWDT_BROWN_OUT_RESET";
        case 16: return "RTCWDT_RTC_RESET";
        default: return "UNKNOWN_RESET";
    }
}

void triggerHazard(const char* reason) {
    if (xSemaphoreTake(xStateMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        currentState = STATE_HAZARD;
        relays.stopAll();
        sharedTelemetry.state = STATE_HAZARD;
        sharedTelemetry.intakeOn = false;
        sharedTelemetry.outtakeOn = false;
        sharedTelemetry.airOn = false;
        sharedTelemetry.lightOn = false;
        sharedTelemetry.agitatorOn = false;
        xSemaphoreGive(xStateMutex);
    }
    mqtt.publishLog("critical", reason);
    TelnetStream.printf("HAZARD TRIGGERED: %s\n", reason);
    Serial.printf("HAZARD TRIGGERED: %s\n", reason);
    xEventGroupSetBits(xControlEvents, EVENT_FORCE_TELEMETRY);
}

void dispatchCommand(const String& cmd) {
    char actionBuf[32];
    strncpy(actionBuf, cmd.c_str(), sizeof(actionBuf) - 1);
    actionBuf[sizeof(actionBuf) - 1] = '\0';
    if (xCommandQueue != NULL) {
        xQueueSend(xCommandQueue, actionBuf, pdMS_TO_TICKS(100));
    }
}

// Pre-Flight Hardware Health Diagnostic
void runPreFlightDiagnostics() {
    Serial.println("\n==================================================");
    Serial.println("   [PRE-FLIGHT HARDWARE DIAGNOSTICS & BUS SCAN]   ");
    Serial.println("==================================================");
    TelnetStream.println("\n[DIAG] === Pre-Flight Hardware Diagnostics ===");

    // 1. I2C Bus Scan
    Serial.println("[DIAG] Scanning I2C Bus (SDA: GPIO 21, SCL: GPIO 22)...");
    uint8_t count = 0;
    if (xSemaphoreTake(xI2CMutex, portMAX_DELAY) == pdTRUE) {
        for (uint8_t addr = 1; addr < 127; addr++) {
            Wire.beginTransmission(addr);
            if (Wire.endTransmission() == 0) {
                Serial.printf("  -> I2C Device Found at 0x%02X: ", addr);
                if (addr == 0x27) Serial.println("Status LCD 1602 [OK]");
                else if (addr == 0x25) Serial.println("Telemetry LCD 1602 [OK]");
                else if (addr == 0x29) Serial.println("Adafruit TCS34725 Color Sensor [OK]");
                else if (addr == 0x76 || addr == 0x77) Serial.println("Adafruit BME280 Environment Sensor [OK]");
                else if (addr == 0x68) Serial.println("DS3231 Real-Time Clock [OK]");
                else Serial.println("Unknown Peripheral");
                count++;
            }
        }
        xSemaphoreGive(xI2CMutex);
    }
    Serial.printf("[DIAG] I2C Scan Complete: %d active devices identified.\n", count);

    // 2. DS18B20 OneWire Bus Test
    waterTemp.update();
    delay(800);
    waterTemp.update();
    float wT = waterTemp.getWaterTemp();
    Serial.printf("[DIAG] DS18B20 Water Temperature: %.2f C -> ", wT);
    if (wT > -50.0f && wT < 80.0f && wT != 85.0f) {
        Serial.println("HEALTHY");
    } else {
        Serial.println("FAULT / DISCONNECTED (Check 4.7k pull-up on Pin 4)");
    }

    // 3. Ultrasonic Sonar Test
    waterLevel.update();
    int dist = waterLevel.getDistanceCM();
    Serial.printf("[DIAG] Ultrasonic Water Level: %d cm -> ", dist);
    if (dist > 0 && dist < 100) {
        Serial.println("HEALTHY");
    } else {
        Serial.println("WARNING (Reading 0 or out of range)");
    }

    // 4. Relay & SSR Polarity Verification
    Serial.println("[DIAG] Actuator Pin Configuration:");
    Serial.printf("  - Grow Lights (Pin %d): Active-HIGH (Replacement Module)\n", RELAY_LIGHT);
    Serial.printf("  - Intake Valve (Pin %d): Active-LOW\n", RELAY_INTAKE);
    Serial.printf("  - Outtake Valve (Pin %d): Active-LOW\n", RELAY_OUTTAKE);
    Serial.printf("  - Aeration SSR (Pin %d): Active-LOW\n", SSR1_AIR_PUMP);
    Serial.printf("  - Agitator Motor (Pin %d): Active-LOW\n", RELAY_AGITATOR);
    Serial.println("==================================================\n");
}

String getTelemetryJSON() {
    JsonDocument doc;
    if (xSemaphoreTake(xStateMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        doc["state"] = stateNames[sharedTelemetry.state];
        doc["wTemp"] = sharedTelemetry.waterTemp;
        doc["aTemp"] = sharedTelemetry.airTemp;
        doc["hum"] = sharedTelemetry.humidity;
        doc["level"] = sharedTelemetry.distanceCM;
        doc["tcsR"] = sharedTelemetry.tcsR;
        doc["tcsG"] = sharedTelemetry.tcsG;
        doc["tcsB"] = sharedTelemetry.tcsB;
        doc["pseudoOD"] = sharedTelemetry.pseudoOD;
        doc["chlA"] = sharedTelemetry.chlA;
        doc["growthRate"] = sharedTelemetry.growthRateMu;
        doc["lightOn"] = config.lightOnHr;
        doc["lightOff"] = config.lightOffHr;
        xSemaphoreGive(xStateMutex);
    }
    char buffer[512];
    serializeJson(doc, buffer);
    return String(buffer);
}

// ==========================================
// MQTT CALLBACK
// ==========================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
    char msg[length + 1];
    for (unsigned int i = 0; i < length; i++) msg[i] = (char)payload[i];
    msg[length] = '\0';
    
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, msg);
    if (error) return;

    if (String(topic).endsWith("/config")) {
        if (xSemaphoreTake(xStateMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
            if (!doc["light_on"].isNull()) config.lightOnHr = doc["light_on"];
            if (!doc["light_off"].isNull()) config.lightOffHr = doc["light_off"];
            if (!doc["en_lights"].isNull()) config.enableLights = doc["en_lights"];
            if (!doc["en_air"].isNull()) config.enableAir = doc["en_air"];
            if (!doc["en_agitator"].isNull()) config.enableAgitator = doc["en_agitator"];
            if (!doc["en_refill"].isNull()) config.enableAutoRefill = doc["en_refill"];
            if (!doc["fill_pct"].isNull()) config.fillPct = doc["fill_pct"];
            if (!doc["chl_calib_k"].isNull()) config.chlCalibK = doc["chl_calib_k"];
            if (!doc["harvest_od"].isNull()) config.harvestOD = doc["harvest_od"];
            if (!doc["crash_dod"].isNull()) config.crashDeltaOD = doc["crash_dod"];
            saveConfig();
            xSemaphoreGive(xStateMutex);
        }
        mqtt.publishLog("info", "Remote Config Applied via MQTT.");
    } 
    else if (String(topic).endsWith("/command")) {
        if (!doc["action"].isNull()) {
            String action = doc["action"].as<String>();
            dispatchCommand(action);
        }
    }
}

// ====================================================================================================
// FREERTOS TASKS
// ====================================================================================================

// ----------------------------------------------------------------------
// TASK 1: FSM & CRITICAL PHYSICAL CONTROL (CORE 1 - HIGH PRIORITY 4)
// ----------------------------------------------------------------------
void Task_FSM_Control(void* pvParameters) {
    TickType_t xLastWakeTime = xTaskGetTickCount();
    char cmdBuf[32];

    for (;;) {
        // Run every 100ms deterministically
        vTaskDelayUntil(&xLastWakeTime, pdMS_TO_TICKS(100));

        // 1. Process any incoming command actions from Queue
        while (xQueueReceive(xCommandQueue, &cmdBuf, 0) == pdTRUE) {
            String action = String(cmdBuf);
            action.trim();
            Serial.printf("[FSM] Processing Command: %s\n", action.c_str());

            if (action == "fill" && currentState == STATE_AWAITING_COMMISSION) {
                mqtt.publishLog("info", "Commissioning Fill Started.");
                currentState = STATE_COMMISSION_FILL;
                relays.setIntake(true);
                actionStartTime = millis();
            } 
            else if (action == "drain_all") {
                mqtt.publishLog("info", "Manual Drain (Complete) Initiated.");
                currentState = STATE_HARVEST;
                targetDistance = DIST_EMPTY; 
                relays.setOuttake(true);
                overshootActive = false;
                actionStartTime = millis();
            } 
            else if (action == "drain_partial") {
                mqtt.publishLog("info", "Manual Harvest Initiated (Leaving 15%).");
                currentState = STATE_HARVEST;
                targetDistance = 6; 
                relays.setOuttake(true);
                overshootActive = false;
                actionStartTime = millis();
            } 
            else if ((action == "agitate" || action == "color_sample") && (currentState == STATE_IDLE || currentState == STATE_MANUAL_OVERRIDE)) {
                mqtt.publishLog("info", "Manual Agitation & Color Sample Triggered (30s).");
                currentState = STATE_AGITATING;
                relays.setAgitator(true);
                actionStartTime = millis();
            } 
            else if (action == "calibrate_baseline") {
                mqtt.publishLog("warning", "Calibrating color sensor baseline in clean water...");
                xEventGroupSetBits(xControlEvents, EVENT_CALIBRATE_BASELINE);
            } 
            else if (action == "emergency_stop") {
                triggerHazard("Manual Emergency Stop via Command");
            } 
            else if (action == "clear_hazard") {
                currentState = STATE_IDLE;
                mqtt.publishLog("info", "Hazard cleared. Resuming IDLE.");
            } 
            else if (action == "restart") {
                mqtt.publishLog("critical", "Software Restart Initiated!");
                vTaskDelay(pdMS_TO_TICKS(500));
                ESP.restart();
            }
            else if (action == "diagnose") {
                runPreFlightDiagnostics();
            }
            else if (action == "demo_cycle") {
                mqtt.publishLog("warning", "=== DEMO CYCLE STARTED ===");
                demoMode = true;
                demoStep = 0;
                demoStepStart = millis();
            }
            else if (action == "manual_mode_on") {
                if (currentState == STATE_IDLE || currentState == STATE_HAZARD || currentState == STATE_AWAITING_COMMISSION) {
                    currentState = STATE_MANUAL_OVERRIDE;
                    mqtt.publishLog("warning", "Manual Override ENABLED.");
                }
            } 
            else if (action == "manual_mode_off") {
                if (currentState == STATE_MANUAL_OVERRIDE) {
                    relays.stopAll();
                    currentState = STATE_IDLE;
                    mqtt.publishLog("info", "Manual Override DISABLED. Resuming IDLE.");
                }
            }
            else if (currentState == STATE_MANUAL_OVERRIDE) {
                if (action == "intake_on") relays.setIntake(true);
                else if (action == "intake_off") relays.setIntake(false);
                else if (action == "outtake_on") relays.setOuttake(true);
                else if (action == "outtake_off") relays.setOuttake(false);
                else if (action == "air_on") relays.setAir(true);
                else if (action == "air_off") relays.setAir(false);
                else if (action == "light_on") relays.setLight(true);
                else if (action == "light_off") relays.setLight(false);
                else if (action == "agitator_on") relays.setAgitator(true);
                else if (action == "agitator_off") relays.setAgitator(false);
            }
            
            xEventGroupSetBits(xControlEvents, EVENT_FORCE_TELEMETRY);
        }

        // 2. Read latest sensor telemetry snapshot
        int currentDist = 0;
        float currentWTemp = 0.0f;
        uint8_t currentHr = 0, currentMin = 0;
        if (xSemaphoreTake(xStateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
            currentDist = sharedTelemetry.distanceCM;
            currentWTemp = sharedTelemetry.waterTemp;
            currentHr = sharedTelemetry.currentHr;
            currentMin = sharedTelemetry.currentMin;
            xSemaphoreGive(xStateMutex);
        }

        // 3. Evaluate Biophysical Safety Interlocks
        if (sensorsReady && currentState != STATE_HAZARD && !demoMode) {
            if (currentWTemp > 35.0f && currentWTemp != -127.0f && currentWTemp != 85.0f) {
                triggerHazard("Thermal Runaway (>35C)!");
            }
            if (waterLevel.isFaulty()) {
                triggerHazard("SENSOR FAULT: Ultrasonic dead!");
            }
            if (currentDist <= 1 && currentDist > 0 && currentState != STATE_COMMISSION_FILL) {
                triggerHazard("OVERFLOW RISK! Level <= 1cm");
            }
        }

        // 4. Daytime Photoperiod Light Evaluation
        bool isDaytime = false;
        if (config.lightOnHr < config.lightOffHr) {
            isDaytime = (currentHr >= config.lightOnHr && currentHr < config.lightOffHr);
        } else {
            isDaytime = (currentHr >= config.lightOnHr || currentHr < config.lightOffHr);
        }

        if (currentState != STATE_MANUAL_OVERRIDE && !demoMode) {
            if (config.enableLights && currentState != STATE_HAZARD) {
                relays.setLight(isDaytime);
            } else {
                relays.setLight(false);
            }
        }

        // 5. Finite State Machine Transitions
        if (demoMode) {
            unsigned long elapsed = millis() - demoStepStart;
            if (demoStep == 0) {
                currentState = STATE_IDLE;
                relays.stopAll();
                relays.setAir(true);
                mqtt.publishLog("info", "DEMO: State shifted to IDLE (Air ON)");
                xEventGroupSetBits(xControlEvents, EVENT_FORCE_TELEMETRY);
                demoStep++; demoStepStart = millis();
            }
            else if (demoStep == 1 && elapsed > 5000) {
                currentState = STATE_AGITATING;
                relays.setAgitator(true);
                mqtt.publishLog("info", "DEMO: State shifted to AGITATING");
                xEventGroupSetBits(xControlEvents, EVENT_FORCE_TELEMETRY);
                demoStep++; demoStepStart = millis();
            }
            else if (demoStep == 2 && elapsed > 5000) {
                currentState = STATE_HARVEST;
                relays.stopAll();
                relays.setOuttake(true);
                mqtt.publishLog("info", "DEMO: State shifted to HARVEST");
                xEventGroupSetBits(xControlEvents, EVENT_FORCE_TELEMETRY);
                demoStep++; demoStepStart = millis();
            }
            else if (demoStep == 3 && elapsed > 5000) {
                currentState = STATE_IDLE;
                relays.stopAll();
                mqtt.publishLog("info", "DEMO: State shifted to IDLE (Wait)");
                xEventGroupSetBits(xControlEvents, EVENT_FORCE_TELEMETRY);
                demoStep++; demoStepStart = millis();
            }
            else if (demoStep == 4 && elapsed > 5000) {
                currentState = STATE_REFILL;
                relays.setIntake(true);
                mqtt.publishLog("info", "DEMO: State shifted to REFILL");
                xEventGroupSetBits(xControlEvents, EVENT_FORCE_TELEMETRY);
                demoStep++; demoStepStart = millis();
            }
            else if (demoStep == 5 && elapsed > 5000) {
                currentState = STATE_IDLE;
                relays.stopAll();
                mqtt.publishLog("info", "=== DEMO CYCLE COMPLETE ===");
                xEventGroupSetBits(xControlEvents, EVENT_FORCE_TELEMETRY);
                demoMode = false;
            }
        } else {
            switch (currentState) {
                case STATE_AWAITING_COMMISSION:
                    // Waiting for 'fill' command
                    break;

                case STATE_COMMISSION_FILL:
                    if (!overshootActive && currentDist <= getEffectiveDistFull() && currentDist > 0) {
                        overshootActive = true;
                        pumpOvershootTimer = millis();
                    }
                    if (overshootActive && (millis() - pumpOvershootTimer >= 10000)) {
                        relays.setIntake(false);
                        overshootActive = false;
                        currentState = STATE_IDLE;
                        mqtt.publishLog("info", "Commissioning complete! Capturing baseline...");
                        xEventGroupSetBits(xControlEvents, EVENT_CALIBRATE_BASELINE);
                    }
                    if (millis() - actionStartTime > 300000) {
                        triggerHazard("Commission Fill Timeout! Stopped to prevent flood.");
                    }
                    break;

                case STATE_IDLE:
                    // 1. Evaporation Refill Check (Daily at 1PM)
                    if (config.enableAutoRefill && currentHr == 13 && currentMin == 0 && currentDist >= DIST_REFILL_TRIG) {
                        mqtt.publishLog("log", "Evaporation detected. Triggering refill.");
                        currentState = STATE_REFILL;
                        overshootActive = false;
                        relays.setIntake(true);
                        actionStartTime = millis();
                    }

                    // 2. Air Pump Schedule (5 min ON, 25 min OFF during daytime)
                    if (config.enableAir && relays.isLightOn()) {
                        if ((currentMin >= 25 && currentMin < 30) || (currentMin >= 55 && currentMin < 60)) {
                            relays.setAir(true);
                        } else {
                            relays.setAir(false);
                        }
                    } else {
                        relays.setAir(false);
                    }

                    // 3. Agitation Schedule (Every 4 hours during day cycle)
                    if (config.enableAgitator && isDaytime) {
                        bool triggerAgi = (currentHr % 4 == 0 && currentMin == 5);
                        if (triggerAgi && (currentMin != lastAgitationMin || currentHr != lastAgitationHour)) {
                            lastAgitationHour = currentHr;
                            lastAgitationMin = currentMin;
                            currentState = STATE_AGITATING;
                            relays.setAgitator(true);
                            actionStartTime = millis();
                            mqtt.publishLog("log", "Scheduled 4-Hour Agitation & Color Sample started.");
                        }
                    }
                    break;

                case STATE_AGITATING:
                    // Run agitator for 30 seconds
                    if (millis() - actionStartTime >= 30000) {
                        relays.setAgitator(false);
                        currentState = STATE_IDLE;
                        mqtt.publishLog("log", "Agitation complete (30s). Fluid settling for optical sample...");
                        // Trigger asynchronous settling & optical reading in Task_Optical_Sampling
                        xEventGroupSetBits(xControlEvents, EVENT_TRIGGER_OPTICAL_SAMPLE);
                    }
                    break;

                case STATE_REFILL:
                    if (!overshootActive && currentDist <= getEffectiveDistFull() && currentDist > 0) {
                        overshootActive = true;
                        pumpOvershootTimer = millis();
                    }
                    if (overshootActive && (millis() - pumpOvershootTimer >= 10000)) {
                        relays.setIntake(false);
                        overshootActive = false;
                        currentState = STATE_IDLE;
                        mqtt.publishLog("log", "Refill complete.");
                    }
                    if (millis() - actionStartTime > 120000 && !overshootActive) {
                        triggerHazard("Dry Run! Inlet running for 2 mins with no level change.");
                    }
                    break;

                case STATE_HARVEST:
                    if (!overshootActive && currentDist >= targetDistance) {
                        overshootActive = true;
                        pumpOvershootTimer = millis();
                    }
                    if (overshootActive && (millis() - pumpOvershootTimer >= 3000)) {
                        relays.setOuttake(false);
                        overshootActive = false;
                        if (targetDistance == DIST_EMPTY) {
                            mqtt.publishLog("info", "Manual drain complete.");
                            currentState = STATE_AWAITING_COMMISSION;
                        } else {
                            mqtt.publishLog("info", "Harvest complete. Auto-refilling.");
                            currentState = STATE_REFILL;
                            relays.setIntake(true);
                            actionStartTime = millis();
                        }
                    }
                    if (millis() - actionStartTime > 600000) {
                        triggerHazard("Harvest Timeout!");
                    }
                    break;

                case STATE_HAZARD:
                case STATE_MANUAL_OVERRIDE:
                    break;
            }
        }

        // 6. Update relay & FSM state in shared telemetry
        if (xSemaphoreTake(xStateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
            sharedTelemetry.state = currentState;
            sharedTelemetry.intakeOn = relays.isIntakeOn();
            sharedTelemetry.outtakeOn = relays.isOuttakeOn();
            sharedTelemetry.airOn = relays.isAirOn();
            sharedTelemetry.lightOn = relays.isLightOn();
            sharedTelemetry.agitatorOn = relays.isAgitatorOn();
            sharedTelemetry.isDaytime = isDaytime;
            xSemaphoreGive(xStateMutex);
        }
    }
}

// ----------------------------------------------------------------------
// TASK 2: BIOPHYSICAL SENSORS (CORE 1 - MEDIUM-HIGH PRIORITY 3)
// ----------------------------------------------------------------------
void Task_Sensors(void* pvParameters) {
    TickType_t xLastWakeTime = xTaskGetTickCount();
    unsigned long lastBME = 0;

    for (;;) {
        vTaskDelayUntil(&xLastWakeTime, pdMS_TO_TICKS(50));

        // 1. Ultrasonic non-blocking ping
        waterLevel.update();

        // 2. DS18B20 OneWire non-blocking conversion
        waterTemp.update();

        // 3. BME280 Environment Sensor (every 2s under I2C Mutex)
        if (millis() - lastBME >= 2000) {
            lastBME = millis();
            if (xSemaphoreTake(xI2CMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
                envSensor.update();
                xSemaphoreGive(xI2CMutex);
            }
        }

        // 4. Update Time & Calendar
        timeManager.update();

        // 5. Publish to shared state
        if (xSemaphoreTake(xStateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
            sharedTelemetry.distanceCM = waterLevel.getDistanceCM();
            sharedTelemetry.waterTemp = waterTemp.getWaterTemp();
            sharedTelemetry.airTemp = envSensor.getAirTemp();
            sharedTelemetry.humidity = envSensor.getHumidity();
            sharedTelemetry.pressure = envSensor.getPressure();
            sharedTelemetry.currentHr = timeManager.getHour();
            sharedTelemetry.currentMin = timeManager.getMinute();
            sharedTelemetry.timeStr = timeManager.getFormattedTime();
            xSemaphoreGive(xStateMutex);
        }

        // Initial 6-second boot stabilization check
        if (!sensorsReady && (millis() - systemReadyTime > 6000)) {
            sensorsReady = true;
            int dist = waterLevel.getDistanceCM();
            if (dist < (DIST_EMPTY - 2) && dist > 0) {
                currentState = STATE_IDLE; // Water already present
            }
            mqtt.publishLog("info", ("System Booted. Reason: " + bootReasonStr).c_str());
        }
    }
}

// ----------------------------------------------------------------------
// TASK 3: ASYNCHRONOUS OPTICAL DENSITY & BIOMASS SAMPLING (CORE 1 - PRIORITY 2)
// ----------------------------------------------------------------------
void Task_Optical_Sampling(void* pvParameters) {
    for (;;) {
        // Wait for optical sample trigger or baseline calibration trigger
        EventBits_t bits = xEventGroupWaitBits(
            xControlEvents,
            EVENT_TRIGGER_OPTICAL_SAMPLE | EVENT_CALIBRATE_BASELINE,
            pdTRUE,  // Clear bits on exit
            pdFALSE, // Wait for either bit
            portMAX_DELAY
        );

        if (bits & EVENT_CALIBRATE_BASELINE) {
            Serial.println("[OPTICAL] Running clean-water baseline calibration...");
            bool origLight = relays.isLightOn();
            if (!origLight) { relays.setLight(true); vTaskDelay(pdMS_TO_TICKS(500)); }

            colorSensor.takeAveragedReading(5, xI2CMutex);
            if (!origLight) { relays.setLight(false); }

            colorSensor.setBaseline();
            if (xSemaphoreTake(xStateMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
                config.baseR = colorSensor.getRed();
                config.baseG = colorSensor.getGreen();
                config.baseB = colorSensor.getBlue();
                config.baseC = colorSensor.getClear();
                saveConfig();
                sharedTelemetry.hasBaseline = true;
                xSemaphoreGive(xStateMutex);
            }
            mqtt.publishLog("info", "Baseline calibration complete and saved to NVS.");
            xEventGroupSetBits(xControlEvents, EVENT_FORCE_TELEMETRY);
        }

        if (bits & EVENT_TRIGGER_OPTICAL_SAMPLE) {
            Serial.println("[OPTICAL] Fluid settle window (5s)...");
            vTaskDelay(pdMS_TO_TICKS(5000)); // Allow bubbles to clear without blocking FSM

            // Ensure grow lights are ON for standardized optical excitation
            bool originalLightState = relays.isLightOn();
            if (!originalLightState) {
                relays.setLight(true);
                vTaskDelay(pdMS_TO_TICKS(500)); // Warm up LED
            }

            // 5-sample averaged read with interleaved I2C mutex release
            colorSensor.takeAveragedReading(5, xI2CMutex);

            if (!originalLightState) {
                relays.setLight(false);
            }

            float greenRatio = colorSensor.getGreenRatio();
            float grRatio = colorSensor.getGRRatio();
            float pseudoOD = colorSensor.getPseudoOD();
            float vegIndex = colorSensor.getVegetationIndex();
            float chlA = colorSensor.getEstimatedChlA(config.chlCalibK);
            float growthRateMu = 0.0f;

            unsigned long now = millis();
            if (previousOD > 0.01f && pseudoOD > 0.01f && previousODTimestamp > 0 && now > previousODTimestamp) {
                float dtHours = (float)(now - previousODTimestamp) / 3600000.0f;
                if (dtHours >= 0.05f) {
                    growthRateMu = logf(pseudoOD / previousOD) / dtHours;
                }
            }
            previousODTimestamp = now;
            previousOD = pseudoOD;

            // Update shared state
            if (xSemaphoreTake(xStateMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
                sharedTelemetry.tcsR = colorSensor.getRed();
                sharedTelemetry.tcsG = colorSensor.getGreen();
                sharedTelemetry.tcsB = colorSensor.getBlue();
                sharedTelemetry.tcsC = colorSensor.getClear();
                sharedTelemetry.greenRatio = greenRatio;
                sharedTelemetry.grRatio = grRatio;
                sharedTelemetry.pseudoOD = pseudoOD;
                sharedTelemetry.vegIndex = vegIndex;
                sharedTelemetry.chlA = chlA;
                sharedTelemetry.growthRateMu = growthRateMu;
                sharedTelemetry.hasBaseline = colorSensor.hasBaseline();
                xSemaphoreGive(xStateMutex);
            }

            // Report to logs
            Serial.printf("[OPTICAL] Sample Complete: Pseudo-OD=%.2f | Chl-a=%.1f ug/L | GrowthRate=%.3f h^-1\n", pseudoOD, chlA, growthRateMu);
            TelnetStream.printf("[OPTICAL] Sample Complete: Pseudo-OD=%.2f | Chl-a=%.1f ug/L | GrowthRate=%.3f h^-1\n", pseudoOD, chlA, growthRateMu);

            // Harvest & Crash Threshold Checks
            if (colorSensor.hasBaseline()) {
                if (pseudoOD >= config.harvestOD) {
                    char msg[128];
                    snprintf(msg, sizeof(msg), "HARVEST READY: OD=%.2f, Chl-a=%.0f ug/L", pseudoOD, chlA);
                    mqtt.publishLog("warning", msg);
                }
                if (previousOD > 0.0f && (previousOD - pseudoOD) >= config.crashDeltaOD) {
                    char msg[128];
                    snprintf(msg, sizeof(msg), "CULTURE CRASH: OD dropped from %.2f to %.2f", previousOD, pseudoOD);
                    mqtt.publishLog("critical", msg);
                }
            }

            mqtt.publishLog("info", "Post-agitation optical reading complete.");
            xEventGroupSetBits(xControlEvents, EVENT_FORCE_TELEMETRY);
        }
    }
}

// ----------------------------------------------------------------------
// TASK 4: NETWORKING, MQTT & CLOUD TELEMETRY (CORE 0 - PRIORITY 2)
// ----------------------------------------------------------------------
void Task_Network_Telemetry(void* pvParameters) {
    unsigned long lastTelemetryTime = 0;
    unsigned long lastHeartbeatTime = 0;

    for (;;) {
        vTaskDelay(pdMS_TO_TICKS(50));

        bool wifiOk = (WiFi.status() == WL_CONNECTED);

        if (wifiOk) {
            ArduinoOTA.handle();
            mqtt.update();

            // Heartbeat every 5 minutes
            if (millis() - lastHeartbeatTime > 300000) {
                lastHeartbeatTime = millis();
                if (mqtt.isConnected()) {
                    JsonDocument hDoc;
                    hDoc["uptime_s"] = millis() / 1000;
                    hDoc["heap"] = ESP.getFreeHeap();
                    hDoc["rssi"] = WiFi.RSSI();
                    char hBuf[128];
                    serializeJson(hDoc, hBuf);
                    mqtt.publishLog("heartbeat", hBuf);
                }
            }
        }

        // Check if forced telemetry or 15s interval elapsed
        EventBits_t bits = xEventGroupGetBits(xControlEvents);
        bool forceTele = (bits & EVENT_FORCE_TELEMETRY);
        if (forceTele) {
            xEventGroupClearBits(xControlEvents, EVENT_FORCE_TELEMETRY);
        }

        if (wifiOk && (forceTele || (millis() - lastTelemetryTime >= 15000))) {
            lastTelemetryTime = millis();

            TelemetrySnapshot snap;
            if (xSemaphoreTake(xStateMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
                snap = sharedTelemetry;
                xSemaphoreGive(xStateMutex);
            }

            bool storeThis = (snap.currentMin % 15 == 0);
            mqtt.publishTelemetry(
                stateNames[snap.state], snap.waterTemp, snap.airTemp, snap.humidity, snap.pressure, snap.distanceCM,
                snap.intakeOn, snap.outtakeOn, snap.airOn, snap.lightOn, snap.agitatorOn,
                snap.tcsR, snap.tcsG, snap.tcsB, snap.tcsC,
                snap.greenRatio, snap.grRatio, snap.pseudoOD, snap.vegIndex, snap.chlA, snap.growthRateMu, snap.hasBaseline,
                snap.isDaytime, snap.currentHr, storeThis
            );
        }

        // Serial & Telnet Text Command Listeners
        if (Serial.available()) {
            String cmd = Serial.readStringUntil('\n');
            cmd.trim();
            if (cmd.length() > 0) dispatchCommand(cmd);
        }
        if (TelnetStream.available()) {
            String cmd = TelnetStream.readStringUntil('\n');
            cmd.trim();
            if (cmd.length() > 0) dispatchCommand(cmd);
        }

        // Update shared network state
        if (xSemaphoreTake(xStateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
            sharedTelemetry.wifiConnected = wifiOk;
            sharedTelemetry.mqttConnected = mqtt.isConnected();
            sharedTelemetry.ipStr = wifiOk ? WiFi.localIP().toString() : "AP: 192.168.4.1";
            xSemaphoreGive(xStateMutex);
        }
    }
}

// ----------------------------------------------------------------------
// TASK 5: CAPTIVE PORTAL & WEB CONFIG SERVER (CORE 0 - PRIORITY 1)
// ----------------------------------------------------------------------
void Task_Captive_Portal(void* pvParameters) {
    for (;;) {
        vTaskDelay(pdMS_TO_TICKS(20));

        if (WiFi.status() != WL_CONNECTED) {
            if (!portal.isActive()) {
                Serial.println("[PORTAL] Starting Offline Captive Portal AP...");
                portal.begin("BioArc-AP", "bioarc_offline");
            }
        } else {
            if (!portal.isActive()) {
                Serial.println("[PORTAL] Starting Local Web Dashboard...");
                portal.startWebServerOnly();
            }
        }

        portal.update();
    }
}

// ----------------------------------------------------------------------
// TASK 6: DUAL LCD 1602 DISPLAYS (CORE 0 - PRIORITY 1)
// ----------------------------------------------------------------------
void Task_Dual_Display(void* pvParameters) {
    for (;;) {
        vTaskDelay(pdMS_TO_TICKS(500));

        TelemetrySnapshot snap;
        if (xSemaphoreTake(xStateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
            snap = sharedTelemetry;
            xSemaphoreGive(xStateMutex);
        }

        if (xSemaphoreTake(xI2CMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
            displays.setSystemData(stateNames[snap.state], snap.ipStr, snap.wifiConnected, snap.mqttConnected);
            displays.setTelemetryData(snap.waterTemp, snap.airTemp, snap.humidity, snap.distanceCM, snap.timeStr);
            displays.update();
            xSemaphoreGive(xI2CMutex);
        }
    }
}

// ==========================================
// SETUP
// ==========================================
void setup() {
    Serial.begin(115200);
    while (!Serial && millis() < 3000);
    Serial.println("\n--- [BioArc Hardware FreeRTOS Booting] ---");

    bootReasonStr = getResetReason(rtc_get_reset_reason(0));
    Serial.printf("[SYSTEM] Boot Reason: %s\n", bootReasonStr.c_str());

    // 1. Initialize FreeRTOS Primitives
    xI2CMutex = xSemaphoreCreateMutex();
    xStateMutex = xSemaphoreCreateMutex();
    xCommandQueue = xQueueCreate(16, sizeof(char) * 32);
    xControlEvents = xEventGroupCreate();

    // 2. Load NVS Configurations
    loadConfig();
    loadNetworkConfig();

    // 3. Initialize I2C Bus & Displays
    Wire.begin(I2C_SDA, I2C_SCL);
    if (xSemaphoreTake(xI2CMutex, portMAX_DELAY) == pdTRUE) {
        displays.begin();
        timeManager.begin();
        envSensor.begin();
        colorSensor.begin();
        xSemaphoreGive(xI2CMutex);
    }

    if (config.baseC > 0) {
        colorSensor.loadBaseline(config.baseR, config.baseG, config.baseB, config.baseC);
    }

    // 4. Initialize OneWire, Level Sensor & Relays
    waterTemp.begin();
    waterLevel.begin();
    relays.begin();

    // 5. Pre-Flight Diagnostics
    runPreFlightDiagnostics();

    // 6. Captive Portal & Dynamic Config Callbacks
    portal.setCommandCallback(dispatchCommand);
    portal.setTelemetryCallback(getTelemetryJSON);
    portal.setNetworkConfigCallbacks(
        saveNetworkConfig,
        [](String& ssid, String& pass, String& host, int& port, String& user, String& pswd) {
            ssid = netConfig.wifiSSID;
            pass = netConfig.wifiPass;
            host = netConfig.mqttBroker;
            port = netConfig.mqttPort;
            user = netConfig.mqttUser;
            pswd = netConfig.mqttPass;
        }
    );

    // 7. Wi-Fi Setup
    if (netConfig.wifiSSID.length() > 0) {
        wifiMulti.addAP(netConfig.wifiSSID.c_str(), netConfig.wifiPass.c_str());
    }
    wifiMulti.addAP("seVen_Office", "----____");

    Serial.println("[SYSTEM] Attempting Wi-Fi Connection...");
    unsigned long wifiStart = millis();
    while (wifiMulti.run() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
        if (millis() - wifiStart > 12000) {
            Serial.println("\n[WARNING] Wi-Fi timeout! Captive Portal fallback active.");
            break;
        }
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[SUCCESS] Wi-Fi Connected!");
        Serial.printf("[SYSTEM] IP Address: %s\n", WiFi.localIP().toString().c_str());
        portal.startWebServerOnly();
        TelnetStream.begin();
        MDNS.begin("bioarc");
        ArduinoOTA.onStart([]() { relays.stopAll(); });
        ArduinoOTA.setPassword("bioarc2026");
        ArduinoOTA.begin();

        timeManager.setupNTP();
        mqtt.begin(netConfig.mqttBroker.c_str(), netConfig.mqttPort, netConfig.mqttUser.c_str(), netConfig.mqttPass.c_str());
        mqtt.setCallback(mqttCallback);
    }

    // 8. Launch FreeRTOS Tasks
    Serial.println("[SYSTEM] Spawning FreeRTOS Dual-Core Tasks...");

    // Core 1 Tasks (Real-Time Control & Biophysical Sensing)
    xTaskCreatePinnedToCore(Task_FSM_Control,        "Task_FSM",      4096, NULL, 4, NULL, 1);
    xTaskCreatePinnedToCore(Task_Sensors,            "Task_Sensors",  3072, NULL, 3, NULL, 1);
    xTaskCreatePinnedToCore(Task_Optical_Sampling,  "Task_Optical",  3072, NULL, 2, NULL, 1);

    // Core 0 Tasks (Networking, Web Portal & Dual Displays)
    xTaskCreatePinnedToCore(Task_Network_Telemetry, "Task_Network",  8192, NULL, 2, NULL, 0); // 8KB for mbedTLS stack
    xTaskCreatePinnedToCore(Task_Captive_Portal,     "Task_Portal",   4096, NULL, 1, NULL, 0);
    xTaskCreatePinnedToCore(Task_Dual_Display,       "Task_Display",  3072, NULL, 1, NULL, 0);

    systemReadyTime = millis();
    Serial.println("[SUCCESS] BioArc FreeRTOS Kernel Active.\n");
}

// ==========================================
// ARDUINO LOOP
// In FreeRTOS, the main work is executed in the pinned tasks above.
// The default Arduino loop task runs at priority 1 on Core 1 and yields.
// ==========================================
void loop() {
    vTaskDelay(pdMS_TO_TICKS(1000));
}
