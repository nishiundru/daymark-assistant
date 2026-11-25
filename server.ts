import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getErrorStatus(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : 'Unexpected assistant error.';
  if (rawMessage.includes('GEMINI_API_KEY')) {
    return {
      status: 503,
      message:
        'Gemini API key is not configured on this server. Add GEMINI_API_KEY in Settings > Secrets to run live assistant analysis.',
    };
  }
  if (rawMessage.includes('403') || rawMessage.includes('PERMISSION_DENIED')) {
    return {
      status: 403,
      message: 'Gemini API permission denied. Please verify GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Gemini API quota reached. Please try again shortly.',
    };
  }
  return { status: 500, message: rawMessage };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // 1. Analyze an email/notice and extract facts + an approval-ready draft
  app.post('/api/assistant/analyze-mail', async (req, res) => {
    try {
      const { rawEmailText, sender, subject, calendarSummary, emailPermission } = req.body ?? {};

      if (emailPermission === 'paused') {
        res.status(403).json({
          error: 'Email inbox reading is paused in Privacy & access. Resume access to analyze mail.',
        });
        return;
      }

      if (!rawEmailText || typeof rawEmailText !== 'string' || rawEmailText.trim().length < 10) {
        res.status(400).json({ error: 'Please provide email or notice text to analyze.' });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `You are Daymark, a careful personal chief of staff. Read the incoming email/notice below, extract concrete facts, spot any refund eligibility, bill spike, deadline, or scheduling opportunity, and prepare a draft action that waits for explicit user approval.

Sender: ${sender || 'Unknown sender'}
Subject: ${subject || 'No subject'}
User Calendar Context: ${calendarSummary || 'Standard weekday availability'}

Raw Email Content:
${rawEmailText.trim()}`,
        config: {
          systemInstruction:
            'Be calm, accurate, concise, and never fabricate account balances. Always stage external replies, payments, or bookings for explicit user approval.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: 'One of: refund, bill, appointment, form, subscription',
              },
              counterparty: { type: Type.STRING },
              proposedActionTitle: { type: Type.STRING },
              dueText: { type: Type.STRING },
              urgencyLabel: { type: Type.STRING },
              summary: { type: Type.STRING },
              anomalyOrOpportunity: { type: Type.STRING },
              keyFacts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING },
                  },
                  required: ['label', 'value'],
                },
              },
              planSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              approvalBoundary: { type: Type.STRING },
              requiresExplicitMoneyConfirm: { type: Type.BOOLEAN },
              draftTo: { type: Type.STRING },
              draftSubject: { type: Type.STRING },
              draftBody: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              proposedSlot: { type: Type.STRING },
            },
            required: [
              'category',
              'counterparty',
              'proposedActionTitle',
              'dueText',
              'urgencyLabel',
              'summary',
              'anomalyOrOpportunity',
              'keyFacts',
              'planSteps',
              'approvalBoundary',
              'requiresExplicitMoneyConfirm',
              'draftTo',
              'draftSubject',
              'draftBody',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({ analysis: parsed });
    } catch (err) {
      const { status, message } = getErrorStatus(err);
      res.status(status).json({ error: message });
    }
  });

  // 2. Analyze user's calendar week for conflicts, buffers, and free windows
  app.post('/api/assistant/analyze-calendar', async (req, res) => {
    try {
      const { events, pendingAppointments, focusGoal, calendarPermission } = req.body ?? {};

      if (calendarPermission === 'paused') {
        res.status(403).json({
          error:
            'Calendar access is paused in Privacy & access. Resume calendar access to run schedule analysis.',
        });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `You are Daymark, a personal chief of staff analyzing a user's calendar. Review their upcoming events and pending appointments, identify tight buffers or conflicts, highlight clean open windows, and address their specific scheduling goal.

User Goal: ${focusGoal || 'Find clean open windows for appointments and errands without back-to-back stress.'}

Upcoming Calendar Events:
${JSON.stringify(events ?? [], null, 2)}

Pending Appointment Requests:
${JSON.stringify(pendingAppointments ?? [], null, 2)}`,
        config: {
          systemInstruction:
            'Keep recommendations practical, specific to the listed dates/times, and calm in tone.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              briefSummary: { type: Type.STRING },
              conflicts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dateLabel: { type: Type.STRING },
                    issue: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                  },
                  required: ['dateLabel', 'issue', 'suggestion'],
                },
              },
              recommendedWindows: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dayLabel: { type: Type.STRING },
                    timeWindow: { type: Type.STRING },
                    bestFor: { type: Type.STRING },
                  },
                  required: ['dayLabel', 'timeWindow', 'bestFor'],
                },
              },
              suggestedHoldTitle: { type: Type.STRING },
              suggestedHoldSlot: { type: Type.STRING },
              suggestedHoldNote: { type: Type.STRING },
            },
            required: ['briefSummary', 'conflicts', 'recommendedWindows'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({ analysis: parsed });
    } catch (err) {
      const { status, message } = getErrorStatus(err);
      res.status(status).json({ error: message });
    }
  });

  // 3. Ask Daymark (Chief of Staff request bar)
  app.post('/api/assistant/ask', async (req, res) => {
    try {
      const { requestText, context } = req.body ?? {};
      if (!requestText || typeof requestText !== 'string' || !requestText.trim()) {
        res.status(400).json({ error: 'Please enter a request for Daymark.' });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `You are Daymark, Clara's personal chief of staff. Answer her request using her current mail, calendar, and bill context. If her request requires sending an email, scheduling an appointment, paying a bill, or filling a form, also return a staged draft task so she can review and approve it in her queue.

User Request: ${requestText.trim()}

Current Context:
${JSON.stringify(context ?? {}, null, 2)}`,
        config: {
          systemInstruction:
            'Be concise, trustworthy, and clear. Never claim you already sent an email or moved money—always stage external actions for approval.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              shouldStageTask: { type: Type.BOOLEAN },
              taskCategory: { type: Type.STRING },
              taskTitle: { type: Type.STRING },
              counterparty: { type: Type.STRING },
              dueText: { type: Type.STRING },
              summary: { type: Type.STRING },
              planSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              approvalBoundary: { type: Type.STRING },
              draftTo: { type: Type.STRING },
              draftSubject: { type: Type.STRING },
              draftBody: { type: Type.STRING },
            },
            required: ['reply', 'shouldStageTask'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({ result: parsed });
    } catch (err) {
      const { status, message } = getErrorStatus(err);
      res.status(status).json({ error: message });
    }
  });

  // Serve Vite middleware in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Daymark server listening on http://localhost:${PORT}`);
  });
}

startServer();
