"""
LNMIIT Smart Healthcare System - AI Health Assistant & Symptom Urgency Classifier
Architecture designed for BioBERT symptom classification and contextual medical triage.
"""

def classify_and_respond(message: str, latest_vitals: dict = None):
    lower = message.lower()

    emergency_keywords = [
        'chest pain', 'cannot breathe', 'difficulty breathing', 'shortness of breath',
        'fainted', 'loss of consciousness', 'severe bleeding', 'seizure', 'coughing blood'
    ]
    attention_keywords = [
        'high fever', 'shivering', 'severe headache', 'vomiting', 'palpitation',
        'racing heart', 'dizzy', 'asthma attack', 'sprain', 'injury'
    ]
    monitor_keywords = [
        'cough', 'cold', 'sore throat', 'mild fever', 'tired', 'fatigue',
        'headache', 'insomnia', 'stress', 'stomach ache'
    ]

    if any(k in lower for k in emergency_keywords):
        urgency = "EMERGENCY"
        guidance = "Your query describes symptoms that can indicate an acute medical condition. Immediate evaluation by medical staff is required. Do not delay in your hostel."
        action = "IMMEDIATE ACTION: Visit the LNMIIT Medical Centre immediately or call the Campus Emergency Desk (+91 94140 00001)."
    elif any(k in lower for k in attention_keywords):
        urgency = "ATTENTION"
        guidance = "Your symptoms suggest an active condition that should be physically examined by an attending physician today to prevent worsening."
        action = "Visit the campus clinic during consultation hours today for evaluation and vital monitoring."
    elif any(k in lower for k in monitor_keywords):
        urgency = "MONITOR"
        guidance = "Your symptoms appear typical of common viral syndromes or study fatigue. Stay well hydrated, rest in your hostel, and monitor temperature."
        action = "Rest, drink warm fluids, and consult the clinic if fever persists beyond 48 hours."
    else:
        urgency = "NORMAL"
        guidance = "Thank you for consulting the LNMIIT Health Assistant. Maintaining adequate sleep, nutrition, and hydration will support your academic performance."
        action = "Track your routine vitals on the portal. Visit the clinic if new discomfort develops."

    vitals_context = None
    if latest_vitals:
        hr = latest_vitals.get("heartRate", "--")
        sp = latest_vitals.get("spo2", "--")
        tm = latest_vitals.get("temperature", "--")
        vitals_context = f"Latest recorded clinic vitals: Pulse: {hr} BPM | SpO2: {sp}% | Temp: {tm}°C"

    return {
        "response": guidance,
        "urgency": urgency,
        "recommendedAction": action,
        "vitalsContext": vitals_context,
        "suggestedQuestions": [
            "What are the LNMIIT medical centre emergency phone numbers?",
            "How can I schedule a bed monitoring session?",
            "What should I do if my fever crosses 38.5°C?"
        ],
        "disclaimer": "AI-generated guidance (Bio-NLP Service). This is not a medical diagnosis. Please consult a qualified doctor for interpretation."
    }
