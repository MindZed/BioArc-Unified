#include "CaptivePortal.h"
#include "dashboard.h"

CaptivePortal::CaptivePortal() : _server(80), _active(false) {
    _commandCallback = nullptr;
    _telemetryCallback = nullptr;
    _saveConfigCallback = nullptr;
    _getConfigCallback = nullptr;
}

void CaptivePortal::begin(const char* apSSID, const char* apPassword) {
    WiFi.mode(WIFI_AP_STA); // Keep STA active so we can try to reconnect in the background
    WiFi.softAP(apSSID, apPassword);
    
    // Captive portal DNS redirect (resolve all to our IP)
    _dnsServer.start(53, "*", WiFi.softAPIP());
    
    _server.on("/", HTTP_GET, std::bind(&CaptivePortal::handleRoot, this));
    _server.on("/config", HTTP_GET, std::bind(&CaptivePortal::handleConfigGet, this));
    _server.on("/config", HTTP_POST, std::bind(&CaptivePortal::handleConfigPost, this));
    _server.on("/api/data", HTTP_GET, std::bind(&CaptivePortal::handleApiData, this));
    _server.on("/api/command", HTTP_GET, std::bind(&CaptivePortal::handleApiCommand, this));
    _server.onNotFound(std::bind(&CaptivePortal::handleNotFound, this));
    
    _server.begin();
    _active = true;
    
    Serial.print("[SYSTEM] Captive Portal Started at ");
    Serial.println(WiFi.softAPIP());
}

void CaptivePortal::startWebServerOnly() {
    _server.on("/", HTTP_GET, std::bind(&CaptivePortal::handleRoot, this));
    _server.on("/config", HTTP_GET, std::bind(&CaptivePortal::handleConfigGet, this));
    _server.on("/config", HTTP_POST, std::bind(&CaptivePortal::handleConfigPost, this));
    _server.on("/api/data", HTTP_GET, std::bind(&CaptivePortal::handleApiData, this));
    _server.on("/api/command", HTTP_GET, std::bind(&CaptivePortal::handleApiCommand, this));
    _server.onNotFound(std::bind(&CaptivePortal::handleNotFound, this));
    
    _server.begin();
    _active = true;
    
    Serial.print("[SYSTEM] Local Web Dashboard Started at http://");
    Serial.println(WiFi.localIP());
}

void CaptivePortal::update() {
    if (_active) {
        _dnsServer.processNextRequest();
        _server.handleClient();
    }
}

void CaptivePortal::stop() {
    if (_active) {
        _server.stop();
        _dnsServer.stop();
        WiFi.softAPdisconnect(true);
        _active = false;
        Serial.println("[SYSTEM] Captive Portal Stopped.");
    }
}

bool CaptivePortal::isActive() {
    return _active;
}

void CaptivePortal::setCommandCallback(CommandCallback cb) {
    _commandCallback = cb;
}

void CaptivePortal::setTelemetryCallback(TelemetryCallback cb) {
    _telemetryCallback = cb;
}

void CaptivePortal::setNetworkConfigCallbacks(SaveNetworkConfigCallback saveCb, GetNetworkConfigCallback getCb) {
    _saveConfigCallback = saveCb;
    _getConfigCallback = getCb;
}

void CaptivePortal::handleRoot() {
    _server.send_P(200, "text/html", DASHBOARD_HTML);
}

void CaptivePortal::handleConfigGet() {
    String curSsid = "", curPass = "", curHost = "", curUser = "", curMqttPass = "";
    int curPort = 1777;
    if (_getConfigCallback) {
        _getConfigCallback(curSsid, curPass, curHost, curPort, curUser, curMqttPass);
    }
    
    String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'><title>BioArc Settings</title>";
    html += "<style>body{font-family:'Segoe UI',sans-serif;background:#0A0A0B;color:#fff;margin:0;padding:20px}.container{max-width:500px;margin:auto}";
    html += "h2{color:#10b981;border-bottom:1px solid #333;padding-bottom:8px}label{display:block;margin-top:12px;font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:1px}";
    html += "input{width:100%;box-sizing:border-box;padding:10px;margin-top:4px;border-radius:6px;border:1px solid #27272a;background:#18181b;color:#fff;font-size:14px}";
    html += ".btn{width:100%;padding:12px;margin-top:20px;border:none;border-radius:8px;font-weight:bold;cursor:pointer;background:#10b981;color:#000;font-size:15px}";
    html += ".back{display:block;text-align:center;margin-top:15px;color:#71717a;text-decoration:none;font-size:13px}</style></head><body>";
    html += "<div class='container'><h2>🧬 BioArc Network & MQTT</h2>";
    html += "<form method='POST' action='/config'>";
    html += "<label>Wi-Fi Network Name (SSID)</label><input type='text' name='ssid' value='" + curSsid + "' required>";
    html += "<label>Wi-Fi Password</label><input type='password' name='pass' value='" + curPass + "'>";
    html += "<label>MQTT Broker Host / IP</label><input type='text' name='mqtt_host' value='" + curHost + "' required>";
    html += "<label>MQTT Port</label><input type='number' name='mqtt_port' value='" + String(curPort) + "' required>";
    html += "<label>MQTT Username</label><input type='text' name='mqtt_user' value='" + curUser + "'>";
    html += "<label>MQTT Password</label><input type='password' name='mqtt_pass' value='" + curMqttPass + "'>";
    html += "<button type='submit' class='btn'>Save Settings & Reboot</button>";
    html += "</form><a href='/' class='back'>&larr; Back to Dashboard</a></div></body></html>";
    _server.send(200, "text/html", html);
}

void CaptivePortal::handleConfigPost() {
    String ssid = _server.arg("ssid");
    String pass = _server.arg("pass");
    String mqttHost = _server.arg("mqtt_host");
    int mqttPort = _server.arg("mqtt_port").toInt();
    String mqttUser = _server.arg("mqtt_user");
    String mqttPass = _server.arg("mqtt_pass");

    if (_saveConfigCallback) {
        _saveConfigCallback(ssid, pass, mqttHost, mqttPort, mqttUser, mqttPass);
    }

    String resp = "<!DOCTYPE html><html><head><meta http-equiv='refresh' content='6;url=/'><style>body{background:#0A0A0B;color:#10b981;font-family:sans-serif;text-align:center;padding:50px}</style></head><body>";
    resp += "<h2>✅ Settings Saved!</h2><p style='color:#ccc'>Rebooting BioArc Controller now...</p></body></html>";
    _server.send(200, "text/html", resp);

    delay(1000);
    ESP.restart();
}

void CaptivePortal::handleApiData() {
    if (_telemetryCallback) {
        _server.send(200, "application/json", _telemetryCallback());
    } else {
        _server.send(500, "application/json", "{}");
    }
}

void CaptivePortal::handleApiCommand() {
    if (_server.hasArg("action") && _commandCallback) {
        String action = _server.arg("action");
        _commandCallback(action);
        _server.send(200, "text/plain", "OK");
    } else {
        _server.send(400, "text/plain", "Bad Request");
    }
}

void CaptivePortal::handleNotFound() {
    // Redirect everything else to the root for captive portal functionality
    _server.sendHeader("Location", String("http://") + WiFi.softAPIP().toString(), true);
    _server.send(302, "text/plain", "");
}
