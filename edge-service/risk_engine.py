"""
LNMIIT Smart Healthcare System - Edge Risk Evaluation Engine
Designed for Raspberry Pi local gateway triage.
"""

# Configurable Emergency Thresholds
THRESHOLDS = {
    'SPO2_MIN': 90.0,
    'HEART_RATE_MAX': 150.0,
    'HEART_RATE_MIN': 40.0,
    'TEMP_MAX': 39.4
}

def evaluate_risk(heart_rate, spo2, temperature):
    """
    Evaluates vitals against LNMIIT emergency thresholds.
    Returns: dict(risk_level, score, explanation, is_emergency)
    """
    triggers = []
    score = 10
    is_emergency = False

    if spo2 < THRESHOLDS['SPO2_MIN']:
        triggers.append(f"SpO2 dropped below critical floor ({spo2:.1f}% < 90%)")
        score += 55
        is_emergency = True

    if heart_rate > THRESHOLDS['HEART_RATE_MAX']:
        triggers.append(f"Tachycardia breach ({heart_rate:.0f} BPM > 150 BPM)")
        score += 50
        is_emergency = True
    elif heart_rate < THRESHOLDS['HEART_RATE_MIN'] and heart_rate > 0:
        triggers.append(f"Severe bradycardia ({heart_rate:.0f} BPM < 40 BPM)")
        score += 55
        is_emergency = True

    if temperature > THRESHOLDS['TEMP_MAX']:
        triggers.append(f"Hyperpyrexia fever spike ({temperature:.1f}°C > 39.4°C)")
        score += 45
        is_emergency = True

    score = min(max(score, 0), 100)

    if is_emergency or score >= 75:
        risk_level = "EMERGENCY"
    elif score >= 45:
        risk_level = "ATTENTION"
    elif score >= 20:
        risk_level = "MONITOR"
    else:
        risk_level = "NORMAL"

    explanation = "; ".join(triggers) if triggers else "Normal telemetry signals."

    return {
        "risk_level": risk_level,
        "risk_score": score,
        "explanation": explanation,
        "is_emergency": is_emergency
    }
