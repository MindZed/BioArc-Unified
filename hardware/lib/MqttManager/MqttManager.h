#ifndef MQTT_MANAGER_H
#define MQTT_MANAGER_H

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

class MqttManager {
public:
    MqttManager();
    void begin(const char* mqttServer, int mqttPort = 8883, const char* mqttUser = nullptr, const char* mqttPass = nullptr);
    
    // Non-blocking reconnect loop (call in main loop)
    void update();
    
    // Status
    bool isConnected();
    
    // Callback Registration
    void setCallback(MQTT_CALLBACK_SIGNATURE);
    
    // Publishers
    void publishTelemetry(const char* state, float wTemp, float aTemp, float hum, float press, int level, 
                          bool rIntake, bool rOuttake, bool rAir, bool rLight, bool rAgitator,
                          uint16_t tcsR, uint16_t tcsG, uint16_t tcsB, uint16_t tcsC, 
                          float greenRatio, float grRatio, float pseudoOD, 
                          float vegIndex, float chlA, float growthRateMu, bool hasBaseline,
                          bool photoperiodActive, uint8_t currentHr, bool storeThis);
    void publishLog(const char* level, const char* msg);

private:
    WiFiClientSecure _espClient;
    PubSubClient _client;
    String _mqttServer;
    int _mqttPort;
    String _mqttUser;
    String _mqttPass;
    
    unsigned long _lastReconnectAttempt;
    
    // Topics
    const char* TOPIC_TELEMETRY = "bioarc/device_01/telemetry";
    const char* TOPIC_LOG = "bioarc/device_01/log";
    const char* TOPIC_STATUS = "bioarc/device_01/status";
    const char* TOPIC_COMMAND = "bioarc/device_01/command";
    const char* TOPIC_CONFIG = "bioarc/device_01/config";
};

#endif
