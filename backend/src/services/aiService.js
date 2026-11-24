const prisma = require('./prisma');

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

/**
 * Summarizes medical report text into structured findings.
 * Connects to Python FastAPI NLP service if reachable, otherwise uses intelligent clinical heuristics engine.
 */
async function summarizeMedicalReport(extractedText, title = '') {
  // 1. Try external Python NLP service
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${NLP_SERVICE_URL}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: extractedText, title }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.keyFindings) {
        return {
          keyFindings: data.keyFindings,
          abnormalValues: data.abnormalValues,
          possibleConcerns: data.possibleConcerns,
          questionsToAskDoctor: data.questionsToAskDoctor,
          serviceStatus: 'NLP_SERVICE',
          disclaimer: 'AI-generated summary (Bio-NLP Service). This is not a medical diagnosis. Please consult a qualified doctor for interpretation.'
        };
      }
    }
  } catch (err) {
    // Graceful fallback to built-in rule-based summarizer
    console.log('[AI Service] FastAPI NLP service not reachable. Utilizing structured fallback summarizer engine.');
  }

  // 2. Structured Fallback Heuristics
  const lines = extractedText.split('\n').map(l => l.trim()).filter(Boolean);
  const abnormalLines = [];
  const normalLines = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.includes('high') ||
      lower.includes('low') ||
      lower.includes('elevated') ||
      lower.includes('abnormal') ||
      lower.includes('tachycardia') ||
      lower.includes('bradycardia') ||
      lower.includes('positive')
    ) {
      abnormalLines.push(line);
    } else if (
      lower.includes('normal') ||
      lower.includes('clear') ||
      lower.includes('negative') ||
      lower.includes('regular')
    ) {
      normalLines.push(line);
    }
  }

  const keyFindings = [
    `• Analyzed diagnostic report document: "${title || 'Medical Laboratory/Diagnostics Document'}".`,
    normalLines.length > 0
      ? `• Standard / Within-Range Metrics: ${normalLines.slice(0, 3).join('; ')}`
      : '• Core vital parameters evaluated according to standard university clinic benchmarks.',
    abnormalLines.length > 0
      ? `• Deviations detected in ${abnormalLines.length} specific laboratory or vital parameter(s).`
      : '• No marked acute pathognomonic deviations detected across tested metrics.'
  ].join('\n');

  const abnormalValues = abnormalLines.length > 0
    ? abnormalLines.map(l => `• ${l}`).join('\n')
    : '• No explicit abnormal laboratory values detected based on provided text extract.';

  const possibleConcerns = abnormalLines.length > 0
    ? 'Identified out-of-range parameters suggest possible localized inflammatory activity, physiological fatigue, or metabolic response. These require direct clinical evaluation by your attending campus physician to contextualize against your physical examination and symptoms.'
    : 'Parameters appear predominantly stable. Ensure adequate rest, hydration, and report any emergent symptoms such as chest tightness or high fever.';

  const questionsToAskDoctor = [
    '1. Do any of the highlighted laboratory values require a confirmatory re-test after recovery?',
    '2. Are these readings likely related to my recent physical activity, hydration status, or academic schedule?',
    '3. Do I need any specific dietary adjustments or temporary activity modifications while on campus?'
  ].join('\n');

  return {
    keyFindings,
    abnormalValues,
    possibleConcerns,
    questionsToAskDoctor,
    serviceStatus: 'FALLBACK_ENGINE',
    disclaimer: 'AI-generated summary. This is not a medical diagnosis. Please consult a qualified doctor for interpretation.'
  };
}

/**
 * AI Health Assistant for Student Chat
 * Evaluates symptoms + context of latest vitals readings to generate safe, helpful triage guidance.
 */
async function processHealthChat(message, studentId) {
  // Fetch student recent context: latest vitals and past sessions
  let studentContext = null;
  let latestVitals = null;

  if (studentId) {
    studentContext = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        healthBaselines: true,
        sessions: {
          orderBy: { startTime: 'desc' },
          take: 3,
          include: {
            vitals: {
              orderBy: { timestamp: 'desc' },
              take: 5
            }
          }
        }
      }
    });

    if (studentContext?.sessions?.[0]?.vitals?.[0]) {
      latestVitals = studentContext.sessions[0].vitals[0];
    }
  }

  // 1. Try FastAPI NLP Service if available
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${NLP_SERVICE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        studentId,
        latestVitals: latestVitals ? {
          heartRate: latestVitals.heartRate,
          spo2: latestVitals.spo2,
          temperature: latestVitals.temperature
        } : null
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.response) {
        return data;
      }
    }
  } catch (err) {
    // Proceed to robust built-in clinical triage engine
  }

  // 2. Clinical Triage Heuristics
  const lowerMsg = message.toLowerCase();

  // Safety checks for emergency symptoms
  const emergencyKeywords = [
    'chest pain', 'cannot breathe', 'difficulty breathing', 'shortness of breath',
    'fainted', 'loss of consciousness', 'severe bleeding', 'seizure', 'coughing blood',
    'stroke', 'heart attack', 'unconscious'
  ];

  const attentionKeywords = [
    'high fever', 'shivering', 'severe headache', 'vomiting', 'diarrhea',
    'asthma', 'sprain', 'injury', 'palpitation', 'racing heart', 'dizzy'
  ];

  const monitorKeywords = [
    'cough', 'cold', 'sore throat', 'mild fever', 'tired', 'fatigue',
    'stomach ache', 'headache', 'insomnia', 'stress', 'allergy'
  ];

  let urgency = 'NORMAL';
  let guidance = '';
  let recommendedAction = '';

  const isEmergencySymptom = emergencyKeywords.some(k => lowerMsg.includes(k));
  const isAttentionSymptom = attentionKeywords.some(k => lowerMsg.includes(k));
  const isMonitorSymptom = monitorKeywords.some(k => lowerMsg.includes(k));

  if (isEmergencySymptom) {
    urgency = 'EMERGENCY';
    guidance = 'You have mentioned symptoms that can be associated with acute medical conditions. Immediate clinical evaluation is required. Do not delay or attempt self-treatment in your hostel.';
    recommendedAction = 'IMMEDIATE ACTION: Visit the LNMIIT Medical Centre immediately or contact the Campus Ambulance / Emergency Duty Officer at +91 94140 00001.';
  } else if (isAttentionSymptom) {
    urgency = 'ATTENTION';
    guidance = 'Your reported symptoms indicate an active physiological condition that should be evaluated by a medical doctor today to prevent complications and receive targeted relief.';
    recommendedAction = 'Visit the campus medical room during clinic hours today for a physical checkup and vital sign evaluation.';
  } else if (isMonitorSymptom) {
    urgency = 'MONITOR';
    guidance = 'Your symptoms appear to reflect common campus health complaints (such as viral irritation, study fatigue, or mild distress). Keep well-hydrated, monitor your body temperature, and get adequate rest.';
    recommendedAction = 'Rest in your hostel room, drink warm fluids, and report to the campus clinic if symptoms intensify or persist beyond 48 hours.';
  } else {
    urgency = 'NORMAL';
    guidance = 'Thank you for consulting the LNMIIT Student Health Assistant. Maintain healthy sleep cycles, balanced hydration, and regular meal timing especially during academic examination periods.';
    recommendedAction = 'Keep track of your vital readings via the student portal. If you notice persistent discomfort, schedule a routine consultation at the medical centre.';
  }

  // Contextualize with real latest vitals if present
  let vitalsContextText = null;
  if (latestVitals) {
    vitalsContextText = `Latest recorded vitals: Heart Rate: ${latestVitals.heartRate.toFixed(0)} BPM | SpO₂: ${latestVitals.spo2.toFixed(1)}% | Temp: ${latestVitals.temperature.toFixed(1)}°C (Recorded ${new Date(latestVitals.timestamp).toLocaleTimeString()})`;
  }

  return {
    response: guidance,
    urgency,
    recommendedAction,
    vitalsContext: vitalsContextText,
    suggestedQuestions: [
      'What are the LNMIIT medical centre emergency phone numbers?',
      'How can I schedule a bed monitoring session?',
      'What should I do if my fever crosses 38.5°C?',
      'How to request a digital prescription renewal?'
    ],
    disclaimer: 'Notice: This guidance is generated by an automated health assistant for informational purposes only. It is NOT a medical diagnosis and cannot prescribe treatments. Always consult a qualified medical professional for health concerns.'
  };
}

/**
 * Generates personalized health insights based on actual stored session history.
 */
async function generatePersonalizedInsights(studentId) {
  const sessions = await prisma.monitoringSession.findMany({
    where: { studentId },
    orderBy: { startTime: 'asc' },
    include: {
      vitals: true
    }
  });

  if (sessions.length < 2) {
    return {
      status: 'INSUFFICIENT_DATA',
      message: 'More monitoring sessions are needed to generate personalized insights.',
      insights: []
    };
  }

  const insights = [];
  const latestSession = sessions[sessions.length - 1];
  const previousSession = sessions[sessions.length - 2];

  // 1. Heart Rate Trend
  if (latestSession.avgHeartRate && previousSession.avgHeartRate) {
    const diff = latestSession.avgHeartRate - previousSession.avgHeartRate;
    if (diff > 8) {
      insights.push({
        type: 'HEART_RATE_INCREASE',
        category: 'warning',
        title: 'Elevated Average Heart Rate',
        description: `Your average heart rate in the latest session (${latestSession.avgHeartRate.toFixed(0)} BPM) is higher than your previous visit (${previousSession.avgHeartRate.toFixed(0)} BPM). Consider hydration and stress reduction.`,
        metric: `+${diff.toFixed(1)} BPM`
      });
    } else if (diff < -8) {
      insights.push({
        type: 'HEART_RATE_DECREASE',
        category: 'positive',
        title: 'Heart Rate Recovery',
        description: `Your heart rate has stabilized downward (${latestSession.avgHeartRate.toFixed(0)} BPM vs ${previousSession.avgHeartRate.toFixed(0)} BPM in prior visit), showing positive recovery.`,
        metric: `${diff.toFixed(1)} BPM`
      });
    } else {
      insights.push({
        type: 'HEART_RATE_STABLE',
        category: 'neutral',
        title: 'Consistent Resting Pulse',
        description: `Your average heart rate has remained stable across recent campus clinic sessions (${latestSession.avgHeartRate.toFixed(0)} BPM).`,
        metric: 'Stable'
      });
    }
  }

  // 2. Temperature Stability Trend
  if (latestSession.avgTemperature && previousSession.avgTemperature) {
    const tempDiff = latestSession.avgTemperature - previousSession.avgTemperature;
    if (latestSession.avgTemperature >= 38.0) {
      insights.push({
        type: 'PYREXIA_DETECTED',
        category: 'alert',
        title: 'Fever Trend Active',
        description: `Elevated body temperature (${latestSession.avgTemperature.toFixed(1)}°C) recorded in your latest session indicates an active pyrexic response.`,
        metric: `${latestSession.avgTemperature.toFixed(1)}°C`
      });
    } else if (Math.abs(tempDiff) <= 0.4) {
      insights.push({
        type: 'TEMP_STABLE',
        category: 'positive',
        title: 'Normal Thermoregulation',
        description: 'Your temperature has remained consistent and stable across your recent clinical monitoring sessions.',
        metric: `${latestSession.avgTemperature.toFixed(1)}°C`
      });
    }
  }

  // 3. SpO2 Oxygenation Trend
  if (latestSession.avgSpo2) {
    if (latestSession.avgSpo2 >= 97.5) {
      insights.push({
        type: 'SPO2_EXCELLENT',
        category: 'positive',
        title: 'Optimal Oxygen Saturation',
        description: `Your average blood oxygen saturation is optimal at ${latestSession.avgSpo2.toFixed(1)}%, reflecting strong respiratory efficiency.`,
        metric: `${latestSession.avgSpo2.toFixed(1)}%`
      });
    } else if (latestSession.avgSpo2 < 95.0) {
      insights.push({
        type: 'SPO2_MONITOR',
        category: 'warning',
        title: 'Oxygen Saturation Fluctuations',
        description: `Your SpO₂ readings varied during the last session with an average of ${latestSession.avgSpo2.toFixed(1)}%. Discuss with your doctor if accompanied by breathlessness.`,
        metric: `${latestSession.avgSpo2.toFixed(1)}%`
      });
    }
  }

  return {
    status: 'ACTIVE',
    totalSessionsAnalyzed: sessions.length,
    insights
  };
}

module.exports = {
  summarizeMedicalReport,
  processHealthChat,
  generatePersonalizedInsights
};
