# ☁️ BioArc Cloud Services: Oracle Cloud A1 Ampere Deployment Guide

> **Target Architecture:** Oracle Cloud Infrastructure (OCI) Always-Free A1 Ampere (ARM64)  
> **Source Directory:** `C:\Users\Seven\Work\Hexafall\Next`  
> **Frontend:** Hosted independently on **Vercel**  
> **Database & MQTT Broker:** Hosted independently on the user's external server

---

## 1. Architecture Overview

```mermaid
graph LR
    ESP32[ESP32 Hardware Controller] -->|MQTT Publish: Port 1777| EXT_MQTT[(External MQTT Broker)]
    EXT_MQTT -->|MQTT Subscribe| GO[Go Backend API (Oracle A1)]
    GO -->|Store Telemetry| EXT_PG[(External PostgreSQL)]
    GO <-->|Predict pH / DO / Growth| ML[Python ML Service: Port 5000]
    VERCEL[Next.js 15 Frontend (Vercel)] <-->|REST & WebSockets: Port 8080| GO
```

Since your PostgreSQL and MQTT broker are already managed on a separate dedicated system, the only services needed on the Oracle A1 VPS are:
1. **Go Backend Service (`backend/`)**: Subscribes to the external MQTT broker, persists bioreactor metrics to the external PostgreSQL database, queries the ML model, and exposes WebSockets/REST APIs to Vercel on port `8080`.
2. **Python ML Service (`ml_service/`)**: Runs FastAPI with the pre-trained Random Forest model (`bioreactor_rf_model.pkl`) on port `5000`.

---

## 2. Docker Compose for Oracle A1 Ampere (`docker-compose.oci.yml`)

Create this lightweight `docker-compose.yml` on your Oracle A1 VPS:

```yaml
version: '3.8'

services:
  ml-service:
    build:
      context: ./ml_service
      dockerfile: Dockerfile
    container_name: bioarc_ml_service
    restart: unless-stopped
    ports:
      - "5000:5000"
    networks:
      - bioarc_cloud_net

  go-backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: bioarc_go_backend
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      # Point to your existing external PostgreSQL database:
      - DATABASE_URL=postgres://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DB}?sslmode=disable
      # Point to your existing external MQTT broker:
      - MQTT_BROKER=tcp://${MQTT_HOST}:${MQTT_PORT:-1777}
      - MQTT_CLIENT_ID=bioarc-go-backend-oci
      - MQTT_USER=${MQTT_USER:-bioarc_device}
      - MQTT_PASSWORD=${MQTT_PASSWORD}
      # Internal Docker network link to Python ML service:
      - ML_SERVICE_URL=http://ml-service:5000/predict
    depends_on:
      - ml-service
    networks:
      - bioarc_cloud_net

networks:
  bioarc_cloud_net:
    driver: bridge
```

---

## 3. Environment Configuration (`.env`)

On your Oracle A1 VPS, create a `.env` file next to `docker-compose.oci.yml`:

```env
# External PostgreSQL Credentials
PG_HOST=your_postgres_server_ip
PG_PORT=5432
PG_USER=bioarc_user
PG_PASSWORD=your_postgres_password
PG_DB=bioarc_db

# External MQTT Broker Credentials
MQTT_HOST=your_mqtt_broker_ip
MQTT_PORT=1777
MQTT_USER=bioarc_device
MQTT_PASSWORD=your_mqtt_password
```

---

## 4. Oracle Cloud OCI Security List & Ingress Rules

In the Oracle Cloud Console for your VCN (Virtual Cloud Network):
1. Navigate to **Networking $\rightarrow$ Virtual Cloud Networks $\rightarrow$ Virtual Cloud Network Details $\rightarrow$ Security Lists**.
2. Click **Default Security List for your VCN** $\rightarrow$ **Add Ingress Rules**:
   - **Source CIDR:** `0.0.0.0/0`
   - **IP Protocol:** `TCP`
   - **Destination Port Range:** `8080` (For Next.js / Vercel API and WebSockets communication)
3. Ensure iptables / ufw on Ubuntu allows port 8080:
   ```bash
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8080 -j ACCEPT
   sudo netfilter-persistent save
   ```

---

## 5. Deployment Commands

```bash
# 1. Clone or SCP the backend and ml_service folders from C:\Users\Seven\Work\Hexafall\Next
scp -r backend ml_service ubuntu@<ORACLE_A1_IP>:~/bioarc/

# 2. SSH into your Oracle A1 instance
ssh ubuntu@<ORACLE_A1_IP>
cd ~/bioarc

# 3. Build and launch services with Docker Compose
docker compose -f docker-compose.oci.yml up -d --build

# 4. View live Go backend logs
docker logs -f bioarc_go_backend
```

---

## 6. Connecting Next.js on Vercel

In your Vercel Project Dashboard for BioArc:
* Add the environment variable:
  ```env
  NEXT_PUBLIC_API_URL=http://<ORACLE_A1_IP>:8080
  NEXT_PUBLIC_WS_URL=ws://<ORACLE_A1_IP>:8080/ws
  ```
The Vercel frontend will now stream live telemetry directly from the Go backend on your Oracle A1 Ampere instance!
