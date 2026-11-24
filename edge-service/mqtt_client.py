"""
LNMIIT Smart Healthcare System - Edge MQTT Gateway & Backend Relay
Connects to local Mosquitto MQTT broker on Raspberry Pi, subscribes to ESP32 topics,
processes vitals, and forwards to the central Express.js REST/WebSocket backend.
"""

import json
import time
import requests
from processing import filter_noise
from risk_engine import evaluate_risk
from local_buffer import LocalBuffer

BACKEND_API_URL = "http://localhost:5000/api/edge/vitals"
HEARTBEAT_URL = "http://localhost:5000/api/edge/heartbeat"

buffer = LocalBuffer()

def on_message(client, userdata, msg):
    """
    Callback when MQTT packet arrives on /lnmiit/bed1/vitals or /lnmiit/bed2/vitals
    """
    try:
        payload = json.loads(msg.payload.decode('utf-8'))
        bed_number = payload.get("bedNumber", 1)
        heart_rate = payload.get("heartRate", 75.0)
        spo2 = payload.get("spo2", 98.0)
        temperature = payload.get("temperature", 36.8)
        mac_address = payload.get("macAddress", "24:6F:28:B4:E1:01")

        # Edge Risk Assessment
        risk = evaluate_risk(heart_rate, spo2, temperature)

        edge_frame = {
            "bedNumber": bed_number,
            "heartRate": heart_rate,
            "spo2": spo2,
            "temperature": temperature,
            "macAddress": mac_address,
            "timestamp": int(time.time() * 1000)
        }

        # Attempt forwarding to backend API
        try:
            res = requests.post(BACKEND_API_URL, json=edge_frame, timeout=1.5)
            if res.status_code == 200:
                # Flush cached offline buffer if any
                while buffer.size() > 0:
                    cached_item = buffer.pop()
                    requests.post(BACKEND_API_URL, json=cached_item, timeout=1.0)
            else:
                buffer.push(edge_frame)
        except Exception:
            # Backend temporarily offline -> save to local edge buffer
            buffer.push(edge_frame)

    except Exception as e:
        print(f"[MQTT Gateway] Error parsing payload: {e}")

def main():
    print("==========================================================")
    print(" LNMIIT IoT Edge Gateway Service (Raspberry Pi)")
    print(" Broker:        localhost:1883")
    print(" Topics:        /lnmiit/bed1/vitals, /lnmiit/bed2/vitals")
    print(" Forwarding to: " + BACKEND_API_URL)
    print("==========================================================")

    # In production on Raspberry Pi:
    # import paho.mqtt.client as mqtt
    # client = mqtt.Client()
    # client.on_message = on_message
    # client.connect("localhost", 1883, 60)
    # client.subscribe("/lnmiit/+/vitals")
    # client.loop_forever()

if __name__ == '__main__':
    main()
