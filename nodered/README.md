# LNMIIT Smart Healthcare — Hardware Sensors & Node-RED Integration Guide

This guide describes how your **Raspberry Pi / ESP32** hardware sensors stream data through **Node-RED** to the **LNMIIT Smart Healthcare System** web application and display in real time on the **Doctor Live Monitoring** page.

---

## 1. Actual Hardware Sensors Used

The clinical monitoring box integrates three primary hardware sensors:

1. **Temperature Sensor** (e.g. LM35 / DS18B20 / DHT11):
   - Measures patient body or skin surface temperature in degrees Celsius (**°C**).
   - Normal physiological range: **36.0°C – 37.5°C**.
   - Warning threshold: **> 37.5°C** (Elevated) or **< 35.5°C** (Mild hypothermia).
   - Critical alert threshold: **> 38.5°C** (High pyrexia / fever).

2. **Ultrasonic Sensor** (HC-SR04 Proximity Sensor):
   - Measures distance between bed frame / overhead mount and patient in centimeters (**cm**).
   - In-Bed / Optimal contact: **15 cm – 60 cm**.
   - Edge of Bed / Sitting Up: **60 cm – 90 cm**.
   - Out of Bed / Bed Vacant Alert: **> 90 cm**.
   - Obstacle / Sensor Blocked: **< 10 cm**.

3. **Force Sensor** (FSR — Force Sensitive Resistor / Pressure Mat):
   - Measures physical contact pressure on the clinic bed in Newtons (**N**).
   - Full Body Contact / Patient Resting: **> 25 N**.
   - Partial Pressure / Patient Shifting: **5 N – 25 N**.
   - Bed Vacant / Fall Alert: **< 5 N** (when combined with distance > 80 cm).

---

## 2. End-to-End Data Flow

```
┌────────────────────────────────────────────────────────┐
│             Raspberry Pi / ESP32 Hardware              │
│  - Temperature Sensor (LM35 via ADC or 1-Wire)         │
│  - Ultrasonic Sensor (HC-SR04 Trig & Echo Pins)        │
│  - Force Sensor (FSR Voltage Divider / ADC)            │
└───────────────────────────┬────────────────────────────┘
                            │ Serial / I2C / GPIO
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Node-RED Flow                        │
│  - Function Node: Formats JSON with x-api-key          │
│  - HTTP Request Node: POST to /api/iot/vitals          │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP POST /api/iot/vitals
                            ▼
┌────────────────────────────────────────────────────────┐
│               Node.js Backend Server                   │
│  - Authenticates API Key (x-api-key)                   │
│  - Validates Sensor Ranges                             │
│  - Evaluates Threshold Alerts (Fever, Out-of-bed)      │
│  - Stores in SQLite Database (VitalsReading table)     │
│  - Broadcasts via WebSocket (Socket.IO)                │
└───────────────────────────┬────────────────────────────┘
                            │ Socket.IO (VITALS_UPDATE)
                            ▼
┌────────────────────────────────────────────────────────┐
│              Doctor Live Monitoring Page               │
│  - Temperature Card (°C + mini sparkline + thresholds) │
│  - Ultrasonic Card (cm + visual distance zones)        │
│  - Force Sensor Card (N + surface pressure gauge)      │
│  - Dynamic Multi-Channel Recharts Waveform             │
│  - Configurable Threshold Alerts Drawer                │
│  - Live Hardware vs Demo Status Badge                  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Node-RED Configuration Specification

### Target Endpoint
- **URL:** `http://<SERVER_IP>:5000/api/iot/vitals`  
  *(For testing on the same PC: `http://localhost:5000/api/iot/vitals`)*
- **Method:** `POST`
- **Content-Type:** `application/json`
- **Header:** `x-api-key: lnmiit_nodered_secure_key_2026`

### JSON Payload Schema
```json
{
  "bedNumber": 1,
  "deviceId": "RPI_NODE_RED_BED_1",
  "temperature": 36.8,
  "ultrasonicDistance": 32.5,
  "force": 45.0,
  "timestamp": 1700812345678
}
```

*Alternative field names automatically supported by backend:*
- `temperature`: `temp`, `tempC`, `temperatureC`
- `ultrasonicDistance`: `distance`, `dist`, `ultrasonic`, `proximity`
- `force`: `pressure`, `weight`, `fsr`, `load`

---

## 4. How to Test

### Method A: With Real Hardware in Node-RED
1. Open Node-RED (`http://<PI_IP>:1880`).
2. Import `nodered/flows.json`.
3. Wire your hardware inputs to the function node.
4. Click **Deploy**.
5. Open the website: [http://localhost:5173/doctor/monitoring](http://localhost:5173/doctor/monitoring).
6. Observe the badge flipping to **`REAL HARDWARE (Node-RED)`** with live Temperature, Distance, and Force updating every 2 seconds.

### Method B: Fallback Sensor Simulator (No Hardware Needed)
We have included a full command-line hardware simulator:

```bash
# 1. Normal continuous telemetry:
node scripts/simulate_nodered.js 1 2000 normal

# 2. Test Out-of-bed alert (Distance > 90cm, Force < 5N):
node scripts/simulate_nodered.js 1 2000 vacant

# 3. Test Fever alert (Temperature > 38.5°C):
node scripts/simulate_nodered.js 1 2000 fever
```
