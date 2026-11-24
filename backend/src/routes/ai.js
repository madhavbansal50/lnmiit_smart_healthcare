const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth');
const { processHealthChat, generatePersonalizedInsights } = require('../services/aiService');

const router = express.Router();

// POST /api/ai/chat - AI Health Assistant
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const chatSchema = z.object({
      message: z.string().min(1, 'Message cannot be empty')
    });

    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation failed', errors: parsed.error.flatten().fieldErrors });
    }

    const studentId = req.user.studentProfile?.id || null;
    const result = await processHealthChat(parsed.data.message, studentId);

    return res.json(result);
  } catch (err) {
    console.error('AI Chat Error:', err);
    return res.status(500).json({
      response: 'The health assistant encountered an internal issue. For medical questions or urgent care, please visit the LNMIIT Medical Centre immediately.',
      urgency: 'MONITOR',
      recommendedAction: 'Visit campus clinic.',
      disclaimer: 'AI-generated summary. This is not a medical diagnosis. Please consult a qualified doctor for interpretation.'
    });
  }
});

// GET /api/ai/insights/:studentId
router.get('/insights/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Student isolation check
    if (req.user.role === 'STUDENT' && req.user.studentProfile?.id !== studentId) {
      return res.status(403).json({ message: 'Forbidden: Cannot access other students’ health insights.' });
    }

    const insights = await generatePersonalizedInsights(studentId);
    return res.json(insights);
  } catch (err) {
    console.error('Insights error:', err);
    return res.status(500).json({ message: 'Failed to generate insights' });
  }
});

module.exports = router;
