/**
 * LNMIIT Smart Healthcare System - Risk Scoring & Evaluation Engine
 * Mode: DEMO RULE-BASED RISK ENGINE
 *
 * Architecture note: Designed to allow pluggable inference from an XGBoost / scikit-learn
 * model running on Raspberry Pi edge gateway, while guaranteeing deterministic campus clinic
 * triage thresholds.
 */

// Medical Thresholds (Configurable)
const THRESHOLDS = {
  EMERGENCY: {
    SPO2_MIN: 90.0,
    HEART_RATE_MAX: 150.0,
    HEART_RATE_MIN: 40.0,
    TEMP_MAX: 39.4
  },
  ATTENTION: {
    SPO2_MIN: 94.0,
    HEART_RATE_MAX: 120.0,
    HEART_RATE_MIN: 50.0,
    TEMP_MAX: 38.3,
    TEMP_MIN: 35.5
  },
  MONITOR: {
    SPO2_MIN: 95.5,
    HEART_RATE_MAX: 100.0,
    HEART_RATE_MIN: 55.0,
    TEMP_MAX: 37.6
  }
};

/**
 * Evaluates patient vital readings against clinical baselines and thresholds.
 * @param {Object} vitals - { heartRate, spo2, temperature }
 * @param {Object} baseline - optional { baselineHeartRate, baselineSpo2, baselineTemperature }
 * @returns {Object} { riskLevel, riskScore, riskExplanation, isEmergency, triggers }
 */
function evaluateRisk(vitals, baseline = null) {
  const hr = parseFloat(vitals.heartRate);
  const spo2 = parseFloat(vitals.spo2);
  const temp = parseFloat(vitals.temperature);

  const triggers = [];
  let score = 5; // Healthy baseline score
  let isEmergency = false;

  // 1. Critical Emergency Checks (Immediate override)
  if (spo2 < THRESHOLDS.EMERGENCY.SPO2_MIN) {
    triggers.push(`Critical hypoxemia: SpO₂ dropped to ${spo2.toFixed(1)}% (< ${THRESHOLDS.EMERGENCY.SPO2_MIN}%)`);
    score += 55;
    isEmergency = true;
  }

  if (hr > THRESHOLDS.EMERGENCY.HEART_RATE_MAX) {
    triggers.push(`Severe tachycardia: Heart rate reached ${hr.toFixed(0)} BPM (> ${THRESHOLDS.EMERGENCY.HEART_RATE_MAX} BPM)`);
    score += 50;
    isEmergency = true;
  } else if (hr < THRESHOLDS.EMERGENCY.HEART_RATE_MIN && hr > 0) {
    triggers.push(`Severe bradycardia: Heart rate dropped to ${hr.toFixed(0)} BPM (< ${THRESHOLDS.EMERGENCY.HEART_RATE_MIN} BPM)`);
    score += 55;
    isEmergency = true;
  }

  if (temp > THRESHOLDS.EMERGENCY.TEMP_MAX) {
    triggers.push(`Hyperpyrexia: Body temperature reached ${temp.toFixed(1)}°C (> ${THRESHOLDS.EMERGENCY.TEMP_MAX}°C)`);
    score += 45;
    isEmergency = true;
  }

  // 2. Attention Checks (if not already triggered critical)
  if (!isEmergency) {
    if (spo2 < THRESHOLDS.ATTENTION.SPO2_MIN) {
      triggers.push(`Sub-optimal oxygen saturation: SpO₂ is ${spo2.toFixed(1)}% (< 94%)`);
      score += 35;
    }

    if (hr > THRESHOLDS.ATTENTION.HEART_RATE_MAX) {
      triggers.push(`Moderate tachycardia: Heart rate elevated to ${hr.toFixed(0)} BPM`);
      score += 30;
    } else if (hr < THRESHOLDS.ATTENTION.HEART_RATE_MIN && hr > 0) {
      triggers.push(`Moderate bradycardia: Heart rate depressed to ${hr.toFixed(0)} BPM`);
      score += 30;
    }

    if (temp > THRESHOLDS.ATTENTION.TEMP_MAX) {
      triggers.push(`High pyrexia: Body temperature elevated to ${temp.toFixed(1)}°C`);
      score += 30;
    }
  }

  // 3. Monitor Checks (Mild fluctuations)
  if (!isEmergency && triggers.length === 0) {
    if (spo2 < THRESHOLDS.MONITOR.SPO2_MIN) {
      triggers.push(`Borderline oxygen saturation: SpO₂ is ${spo2.toFixed(1)}%`);
      score += 18;
    }

    if (hr > THRESHOLDS.MONITOR.HEART_RATE_MAX) {
      triggers.push(`Mild tachycardia: Heart rate at ${hr.toFixed(0)} BPM`);
      score += 18;
    }

    if (temp > THRESHOLDS.MONITOR.TEMP_MAX) {
      triggers.push(`Low-grade fever: Temperature at ${temp.toFixed(1)}°C`);
      score += 18;
    }
  }

  // 4. Baseline Deviation Check
  if (baseline) {
    if (baseline.baselineHeartRate && hr > baseline.baselineHeartRate + 25) {
      triggers.push(`Heart rate is +${(hr - baseline.baselineHeartRate).toFixed(0)} BPM above student baseline (${baseline.baselineHeartRate.toFixed(0)} BPM)`);
      score += 15;
    }
    if (baseline.baselineSpo2 && (baseline.baselineSpo2 - spo2) > 3.0) {
      triggers.push(`SpO₂ has decreased by ${(baseline.baselineSpo2 - spo2).toFixed(1)}% from personal baseline`);
      score += 15;
    }
  }

  // Cap score between 0 and 100
  score = Math.min(Math.max(score, 0), 100);

  // Assign Risk Level
  let riskLevel = 'NORMAL';
  if (isEmergency || score >= 75) {
    riskLevel = 'EMERGENCY';
    score = Math.max(score, 85);
  } else if (score >= 45) {
    riskLevel = 'ATTENTION';
  } else if (score >= 20) {
    riskLevel = 'MONITOR';
  }

  // Generate doctor-readable explanation
  let riskExplanation = '';
  if (riskLevel === 'EMERGENCY') {
    riskExplanation = triggers.join('; ') || 'Critical physiological alert requiring immediate medical triage.';
  } else if (riskLevel === 'ATTENTION') {
    riskExplanation = triggers.join('; ') || 'Notable vital signs deviation detected. Clinical observation advised.';
  } else if (riskLevel === 'MONITOR') {
    riskExplanation = triggers.join('; ') || 'Mild vital fluctuations observed. Continuing continuous monitoring.';
  } else {
    riskExplanation = 'All vital signs are stable within normal physiological boundaries.';
  }

  return {
    riskLevel,
    riskScore: Math.round(score),
    riskExplanation,
    isEmergency,
    triggers,
    engine: 'DEMO_RULE_BASED'
  };
}

module.exports = {
  evaluateRisk,
  THRESHOLDS
};
