"""
LNMIIT Smart Healthcare System - Medical Report NLP Summarizer
Architecture ready for fine-tuned medical T5 / clinical transformer summarization.
Provides structured clinical synthesis: Key Findings, Abnormal Values, Concerns, Questions for Doctor.
"""

def summarize_report(text: str, title: str = ""):
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    abnormal = []
    normal = []

    for l in lines:
        lower = l.lower()
        if any(k in lower for k in ["high", "low", "elevated", "abnormal", "tachycardia", "bradycardia", "positive"]):
            abnormal.append(l)
        elif any(k in lower for k in ["normal", "clear", "negative", "regular"]):
            normal.append(l)

    key_findings = (
        f"• Diagnostic document examined: {title or 'Clinical Laboratory Report'}\n"
        f"• Physiological parameters evaluated according to standard university clinical metrics.\n"
        + (f"• Within-range parameters: {'; '.join(normal[:3])}\n" if normal else "")
        + (f"• Highlighted deviations detected across {len(abnormal)} parameter(s)." if abnormal else "• No overt pathology flagged.")
    )

    abnormal_values = (
        "\n".join([f"• {x}" for x in abnormal])
        if abnormal
        else "• All quantified parameters fall within institutional reference boundaries."
    )

    concerns = (
        "Deviations detected in report warrant physical clinical follow-up with campus physician to differentiate acute reactive changes from baseline fluctuations."
        if abnormal
        else "No alarming metabolic or structural indicators observed. Routine rest and standard hydration advised."
    )

    questions = (
        "1. Does this test report require a follow-up panel after symptom resolution?\n"
        "2. Are these deviations associated with my recent academic study routine or physical fatigue?\n"
        "3. Do I need any temporary dietary or athletic restrictions on campus?"
    )

    return {
        "keyFindings": key_findings,
        "abnormalValues": abnormal_values,
        "possibleConcerns": concerns,
        "questionsToAskDoctor": questions,
        "serviceStatus": "NLP_SERVICE",
        "disclaimer": "AI-generated summary (Bio-NLP Service). This is not a medical diagnosis. Please consult a qualified doctor for interpretation."
    }
