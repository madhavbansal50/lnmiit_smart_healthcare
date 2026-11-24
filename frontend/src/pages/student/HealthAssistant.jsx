import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, Trash2, ShieldAlert, Heart, Activity, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { RiskBadge } from '../../components/common/Badge';

export const HealthAssistant = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello! I am the LNMIIT Student Health Assistant. I can help evaluate campus health symptoms, explain recent vital readings, and advise when to visit the campus medical centre.',
      urgency: 'NORMAL',
      recommendedAction: 'Maintain hydration and balanced sleep.',
      suggestedQuestions: [
        'What should I do if my fever crosses 38.5°C?',
        'How does the campus clinic vital sensor monitoring work?',
        'What are the LNMIIT Medical Centre emergency numbers?'
      ],
      disclaimer: 'Notice: Automated guidance. Not a medical diagnosis. Please consult a qualified doctor for health concerns.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const userMsg = textToSend || input;
    if (!userMsg.trim() || loading) return;

    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: userMsg });
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: res.data.response,
          urgency: res.data.urgency || 'NORMAL',
          recommendedAction: res.data.recommendedAction,
          vitalsContext: res.data.vitalsContext,
          suggestedQuestions: res.data.suggestedQuestions,
          disclaimer: res.data.disclaimer
        }
      ]);
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'The assistant could not process your query at this moment. For urgent campus health concerns, report to the medical centre immediately.',
          urgency: 'MONITOR',
          recommendedAction: 'Visit campus clinic.',
          disclaimer: 'Automated service. Consult a physician.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat cleared. How can I assist you with your campus health questions today?',
        urgency: 'NORMAL',
        disclaimer: 'Notice: Automated guidance. Not a medical diagnosis.'
      }
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-sky-600" />
            AI Campus Health Assistant
          </h2>
          <p className="text-sm text-slate-500">
            Interactive triage guidance, symptom screening, and telemetry context
          </p>
        </div>
        <button
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear Conversation
        </button>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200 mt-1">
                  <Bot className="w-5 h-5" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs sm:text-sm space-y-2.5 ${
                  m.role === 'user'
                    ? 'bg-sky-600 text-white rounded-tr-none shadow-sm'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none'
                }`}
              >
                {/* Assistant Urgency Badge */}
                {m.role === 'assistant' && m.urgency && (
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-[11px] font-bold text-slate-500">Assessed Urgency:</span>
                    <RiskBadge level={m.urgency} size="sm" />
                  </div>
                )}

                {/* Vitals Context Tag */}
                {m.vitalsContext && (
                  <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-100 text-[11px] text-sky-900 font-mono">
                    {m.vitalsContext}
                  </div>
                )}

                <p className="leading-relaxed whitespace-pre-line">{m.content}</p>

                {/* Recommended Action */}
                {m.recommendedAction && (
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 font-semibold text-slate-700 text-xs">
                    <strong className="text-sky-700">Action:</strong> {m.recommendedAction}
                  </div>
                )}

                {/* Suggested Questions */}
                {m.suggestedQuestions?.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Suggested Questions:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {m.suggestedQuestions.map((q, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => handleSend(q)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-sky-700 hover:bg-sky-50 transition font-medium"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                {m.disclaimer && (
                  <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-200/40">
                    {m.disclaimer}
                  </p>
                )}
              </div>

              {m.role === 'user' && (
                <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 font-bold text-xs mt-1">
                  You
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200">
                <Bot className="w-5 h-5 animate-spin" />
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 italic">
                Synthesizing clinical advice & sensor context...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your symptoms, resting pulse, or clinic timings..."
              className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-3 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl shadow-md shadow-sky-600/20 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
