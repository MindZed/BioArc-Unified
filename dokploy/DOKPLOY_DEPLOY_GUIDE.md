# Dokploy Production Deployment Guide

This guide describes how to deploy the **Go Backend + Python ML Virtual Sensor** stack in Dokploy for the domain **`bioarc_backend.mindzed.tech`**.

---

## 1. Architecture in Dokploy

The stack consists of two containerized microservices defined in [`docker-compose.yml`](file:///C:/Users/Seven/Work/BioArc-Unified/dokploy/docker-compose.yml):
1. **`go-backend`**:
   - Exposed on port `8080` (handles HTTPS REST API and WSS WebSockets via Traefik).
   - Connects to internal PostgreSQL container: `postgres-databases-sharedpostgres-kooq42:5432`.
   - Connects to Oracle Mosquitto broker: `tcps://mqtt.mindzed.tech:8883` over TLS.
2. **`ml-service`**:
   - Internal container running Python FastAPI with `bioreactor_rf_model.pkl` on port `5000`.
   - Only reachable internally by the Go backend at `http://ml-service:5000/predict`.

---

## 2. Deployment Steps in Dokploy

### Step 1: Create a Compose Stack (or Application)
1. In your Dokploy dashboard, go to your Project.
2. Click **Create Service** -> **Compose** (or **Application** pointing to this Git repository).
3. Set the Compose file path or paste the contents of `dokploy/docker-compose.yml`.

### Step 2: Set Environment Variables
In the Dokploy **Environment** tab, verify or set:
```env
PORT=8080
DATABASE_URL=postgresql://usr_bioarc_reactor:qDUj2dVjA1vyOg9roG421VsS5cqctRQn@postgres-databases-sharedpostgres-kooq42:5432/db_bioarc_reactor_prod
MQTT_BROKER=tcps://mqtt.mindzed.tech:8883
MQTT_CLIENT_ID=bioarc-go-backend
MQTT_USER=bioarc_v2
MQTT_PASSWORD=bioarc4_v2
ML_SERVICE_URL=http://ml-service:5000/predict
```

### Step 3: Domain & Traefik Routing
1. Go to the **Domains** tab for the `go-backend` service.
2. Add your domain: **`bioarc_backend.mindzed.tech`** (or `bioarc-backend.mindzed.tech`).
3. Set Container Port to: **`8080`**.
4. Enable **HTTPS** (Cloudflare / Let's Encrypt).
5. Dokploy's Traefik reverse proxy will automatically proxy HTTP and WebSockets (`/ws`) through port 8080!

### Step 4: Click Deploy
1. Click **Deploy**.
2. Monitor build logs:
   - Go binary compiles cleanly inside Alpine.
   - Python dependencies install for FastAPI and scikit-learn.
3. Check container logs after startup:
   - `Connected to PostgreSQL database successfully.`
   - `Connected to MQTT Broker!`
   - `Subscribed to MQTT topic: bioarc/device_01/telemetry`
   - `Starting API server on port 8080...`

---

## 3. Verification Commands

Once deployed, test from any terminal:
```bash
# 1. Test REST endpoint
curl https://bioarc_backend.mindzed.tech/api/telemetry/history?hours=1

# 2. Test WebSocket connection
wscat -c wss://bioarc_backend.mindzed.tech/ws
```
