#ifndef DASHBOARD_H
#define DASHBOARD_H

#include <Arduino.h>

const char DASHBOARD_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>BioArc Offline Dashboard</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0A0A0B; color: #fff; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: auto; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 24px; color: #10b981; }
        .status-badge { background: #10b98122; color: #10b981; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; border: 1px solid #10b98144; }
        
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
        .card { background: #18181b; padding: 15px; border-radius: 12px; border: 1px solid #27272a; }
        .card-title { font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
        .card-value { font-size: 22px; font-weight: bold; }
        
        .btn { width: 100%; padding: 12px; margin-bottom: 10px; border: none; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .btn-primary { background: #10b981; color: #000; }
        .btn-primary:active { background: #059669; }
        .btn-danger { background: #ef4444; color: #fff; margin-top: 15px; }
        .btn-danger:active { background: #dc2626; }
        
        #stateText { color: #facc15; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>BioArc <span style="color:#fff; font-size:16px;">Local</span></h1>
            <div class="status-badge">AP MODE</div>
        </div>
        
        <div style="margin-bottom: 15px; font-size: 14px;">System State: <span id="stateText">LOADING...</span></div>

        <div class="grid">
            <div class="card">
                <div class="card-title">Water Temp</div>
                <div class="card-value"><span id="wTemp">--</span> <span style="font-size:12px;color:#71717a;">&deg;C</span></div>
            </div>
            <div class="card">
                <div class="card-title">Air Temp</div>
                <div class="card-value"><span id="aTemp">--</span> <span style="font-size:12px;color:#71717a;">&deg;C</span></div>
            </div>
            <div class="card">
                <div class="card-title">Humidity</div>
                <div class="card-value"><span id="hum">--</span> <span style="font-size:12px;color:#71717a;">%</span></div>
            </div>
            <div class="card">
                <div class="card-title">Level</div>
                <div class="card-value"><span id="level">--</span> <span style="font-size:12px;color:#71717a;">cm</span></div>
            </div>
            <div class="card">
                <div class="card-title">TCS Color (RGB)</div>
                <div class="card-value" style="font-size:16px;">
                    <span id="tcsR" style="color:#f87171">--</span> /
                    <span id="tcsG" style="color:#4ade80">--</span> /
                    <span id="tcsB" style="color:#60a5fa">--</span>
                </div>
            </div>
            <div class="card">
                <div class="card-title">Biomass (OD / Chl-a)</div>
                <div class="card-value" style="font-size:16px;">
                    <span id="pseudoOD" style="color:#a7f3d0">--</span> OD /
                    <span id="chlA" style="color:#34d399">--</span> &micro;g/L
                </div>
            </div>
            <div class="card">
                <div class="card-title">Daylight Config</div>
                <div class="card-value" style="font-size:16px;"><span id="lightCfg">--:--</span></div>
            </div>
        </div>

        <h3>Manual Overrides</h3>
        <button class="btn btn-primary" onclick="sendCommand('fill')">Start Commission Fill</button>
        <button class="btn btn-primary" onclick="sendCommand('agitate')">Trigger Agitation</button>
        <button class="btn btn-primary" onclick="sendCommand('color_sample')">Test Color Sample (30s)</button>
        <button class="btn btn-primary" style="background:#059669; color:#fff;" onclick="sendCommand('calibrate_baseline')">Calibrate Baseline</button>
        <button class="btn btn-primary" onclick="sendCommand('drain_all')">Drain Tank (Harvest)</button>
        <button class="btn btn-danger" onclick="sendCommand('emergency_stop')">EMERGENCY STOP</button>
        <button class="btn btn-primary" style="background:#3f3f46; color:#fff;" onclick="sendCommand('clear_hazard')">Clear Hazard State</button>
        
        <h3 style="margin-top:25px;">Settings & Cloud</h3>
        <a href="/config" class="btn" style="background:#2563eb; color:#fff; display:block; text-align:center; text-decoration:none; box-sizing:border-box;">Configure Wi-Fi & MQTT Broker</a>
    </div>

    <script>
        function updateData() {
            fetch('/api/data')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('stateText').innerText = data.state;
                    document.getElementById('wTemp').innerText = data.wTemp;
                    document.getElementById('aTemp').innerText = data.aTemp;
                    document.getElementById('hum').innerText = data.hum;
                    document.getElementById('level').innerText = data.level;
                    document.getElementById('tcsR').innerText = data.tcsR;
                    document.getElementById('tcsG').innerText = data.tcsG;
                    document.getElementById('tcsB').innerText = data.tcsB;
                    document.getElementById('pseudoOD').innerText = (data.pseudoOD !== undefined) ? Number(data.pseudoOD).toFixed(2) : "--";
                    document.getElementById('chlA').innerText = (data.chlA !== undefined) ? Number(data.chlA).toFixed(0) : "--";
                    document.getElementById('lightCfg').innerText = data.lightOn + "h - " + data.lightOff + "h";
                })
                .catch(e => console.log('Fetch error'));
        }
        
        function sendCommand(action) {
            fetch('/api/command?action=' + action).then(r => {
                setTimeout(updateData, 500);
            });
        }
        
        setInterval(updateData, 2000);
        updateData();
    </script>
</body>
</html>
)rawliteral";

#endif
