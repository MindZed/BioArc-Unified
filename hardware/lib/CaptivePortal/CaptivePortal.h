#ifndef CAPTIVE_PORTAL_H
#define CAPTIVE_PORTAL_H

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <ArduinoJson.h>

typedef void (*CommandCallback)(const String& action);
typedef String (*TelemetryCallback)();
typedef void (*SaveNetworkConfigCallback)(const String& ssid, const String& pass, const String& mqttHost, int mqttPort, const String& mqttUser, const String& mqttPass);
typedef void (*GetNetworkConfigCallback)(String& ssid, String& pass, String& mqttHost, int& mqttPort, String& mqttUser, String& mqttPass);

class CaptivePortal {
public:
    CaptivePortal();
    void begin(const char* apSSID = "BioArc-AP", const char* apPassword = "bioarc_offline");
    void startWebServerOnly();
    void update();
    void stop();
    bool isActive();

    void setCommandCallback(CommandCallback cb);
    void setTelemetryCallback(TelemetryCallback cb);
    void setNetworkConfigCallbacks(SaveNetworkConfigCallback saveCb, GetNetworkConfigCallback getCb);

private:
    WebServer _server;
    DNSServer _dnsServer;
    bool _active;
    
    CommandCallback _commandCallback;
    TelemetryCallback _telemetryCallback;
    SaveNetworkConfigCallback _saveConfigCallback;
    GetNetworkConfigCallback _getConfigCallback;

    void handleRoot();
    void handleConfigGet();
    void handleConfigPost();
    void handleApiData();
    void handleApiCommand();
    void handleNotFound();
};

#endif
