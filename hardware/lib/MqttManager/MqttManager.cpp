#include "MqttManager.h"
#include <TelnetStream.h>

MqttManager::MqttManager() : _client(_espClient) {
    _lastReconnectAttempt = 0;
}

void MqttManager::begin(const char* mqttServer, int mqttPort, const char* mqttUser, const char* mqttPass) {
    _mqttServer = (mqttServer != nullptr) ? mqttServer : "";
    _mqttPort = mqttPort;
    _mqttUser = (mqttUser != nullptr) ? mqttUser : "";
    _mqttPass = (mqttPass != nullptr) ? mqttPass : "";
    
    // Enable TLS for MQTTS (Port 8883)
    _espClient.setInsecure(); // Handles encrypted TLS handshake
    _client.setServer(_mqttServer.c_str(), _mqttPort);
    
    // Larger buffer for ML telemetry JSON
    _client.setBufferSize(1024);
}

void MqttManager::setCallback(MQTT_CALLBACK_SIGNATURE) {
    _client.setCallback(callback);
}

bool MqttManager::isConnected() {
    return _client.connected();
}

void MqttManager::update() {
    if (WiFi.status() == WL_CONNECTED && _mqttServer.length() > 0) {
        if (!_client.connected()) {
            unsigned long now = millis();
            // Try to reconnect every 5 seconds (non-blocking)
            if (now - _lastReconnectAttempt > 5000) {
                _lastReconnectAttempt = now;
                Serial.printf("[MQTT] Attempting connection to %s:%d...\n", _mqttServer.c_str(), _mqttPort);
                TelnetStream.printf("[MQTT] Attempting connection to %s:%d...\n", _mqttServer.c_str(), _mqttPort);
                
                String clientId = "BioArc-ESP32-" + String(random(0xffff), HEX);
                
                // Connect with or without auth based on if credentials are set
                bool connected = false;
                if (_mqttUser.length() > 0 && _mqttPass.length() > 0) {
                    connected = _client.connect(clientId.c_str(), _mqttUser.c_str(), _mqttPass.c_str(), TOPIC_STATUS, 1, true, "offline");
                } else {
                    // LWT (Last Will and Testament)
                    connected = _client.connect(clientId.c_str(), NULL, NULL, TOPIC_STATUS, 1, true, "offline");
                }
                
                if (connected) {
                    Serial.println("[SUCCESS] MQTT Connected.");
                    TelnetStream.println("[SUCCESS] MQTT Connected.");
                    
                    // Publish online status
                    _client.publish(TOPIC_STATUS, "online", true);
                    
                    // Subscribe to incoming topics
                    _client.subscribe(TOPIC_COMMAND);
                    _client.subscribe(TOPIC_CONFIG);
                } else {
                    Serial.print("[WARNING] MQTT Connect Failed, rc=");
                    Serial.println(_client.state());
                }
            }
        } else {
            // If connected, keep the loop running
            _client.loop();
        }
    }
}

void MqttManager::publishTelemetry(const char* state, float wTemp, float aTemp, float hum, float press, int level, 
                                   bool rIntake, bool rOuttake, bool rAir, bool rLight, bool rAgitator,
                                   uint16_t tcsR, uint16_t tcsG, uint16_t tcsB, uint16_t tcsC, 
                                   float greenRatio, float grRatio, float pseudoOD, 
                                   float vegIndex, float chlA, float growthRateMu, bool hasBaseline,
                                   bool photoperiodActive, uint8_t currentHr, bool storeThis) {
    if (!_client.connected()) return; // Don't block or leak if disconnected
    
    JsonDocument doc;
    doc["state"] = state;
    doc["water_temp"] = wTemp;
    doc["air_temp"] = aTemp;
    doc["humidity"] = hum;
    doc["pressure"] = press;
    doc["level_cm"] = level;
    
    // ML Prediction Expected Format
    doc["Water_Temp_C"] = wTemp;
    doc["TCS34725_R"] = tcsR;
    doc["TCS34725_G"] = tcsG;
    doc["TCS34725_B"] = tcsB;
    doc["TCS34725_C"] = tcsC;
    doc["Photoperiod_Active"] = photoperiodActive ? 1 : 0;
    doc["Actuator_AirPump"] = rAir ? 1 : 0;
    doc["Hour_of_Day"] = currentHr;
    
    // Computed biomass & optical metrics
    doc["green_ratio"] = greenRatio;
    doc["gr_ratio"] = grRatio;
    doc["pseudo_od"] = pseudoOD;
    doc["veg_index"] = vegIndex;
    doc["chl_a_ugl"] = chlA;
    doc["growth_rate_u"] = growthRateMu;
    doc["has_baseline"] = hasBaseline;
    
    // Storage flag for Go backend
    doc["store_this"] = storeThis;
    
    JsonObject relays = doc["relays"].to<JsonObject>();
    relays["intake"] = rIntake;
    relays["outtake"] = rOuttake;
    relays["air"] = rAir;
    relays["light"] = rLight;
    relays["agitator"] = rAgitator;
    
    char buffer[1024];
    serializeJson(doc, buffer);
    
    _client.publish(TOPIC_TELEMETRY, buffer);
}

void MqttManager::publishLog(const char* level, const char* msg) {
    if (!_client.connected()) return;
    
    JsonDocument doc;
    doc["level"] = level;
    doc["msg"] = msg;
    
    char buffer[128];
    serializeJson(doc, buffer);
    
    _client.publish(TOPIC_LOG, buffer);
    
    // Also print to Telnet/Serial
    TelnetStream.print("[LOG - "); TelnetStream.print(level); TelnetStream.print("] "); TelnetStream.println(msg);
}
