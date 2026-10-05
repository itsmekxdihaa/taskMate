import OpenAI from 'openai'

// Public Firebase web key (same one shipped in src/firebase.ts); used only to verify ID tokens
const FIREBASE_WEB_API_KEY = 'AIzaSyAIUfZuVeWaeTHAMBVfZilV8_OCVjqpc9s'
const MAX_NOTE_LENGTH = 12000

export type ExtractedTask = {
  title: string
  description: string
  energy: 'high' | 'medium' | 'low'
  energyType: 'mental' | 'physical' | 'mixed'
  urgency: 'high' | 'medium' | 'low'
  estimatedTime: number
  dueDate: string | null
}

export type AiConfig = {
  provider: 'gemini' | 'openai'
  apiKey: string | undefined
  model: string
}

type HandlerResult = { status: number; body: unknown }

// Gemini is preferred when its key is set
export function getAiConfig(env: Record<string, string | undefined>): AiConfig {
  if (env.GEMINI_API_KEY) {
    return { provider: 'gemini', apiKey: env.GEMINI_API_KEY, model: env.AI_MODEL || 'gemini-flash-latest' }
  }
  return { provider: 'openai', apiKey: env.OPENAI_API_KEY, model: env.AI_MODEL || 'gpt-4o-mini' }
}

const GEMINI_FALLBACK_MODELS = ['gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite']
// Overloaded (503), rate limited (429) or transient server errors are worth trying on another model
const RETRYABLE_STATUSES = new Set([429, 500, 503, 504])

class GeminiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

async function callGemini(ai: AiConfig, userMessage: string): Promise<string> {
  const models = [ai.model, ...GEMINI_FALLBACK_MODELS.filter(m => m !== ai.model)]
  let lastError: unknown
  for (const model of models) {
    try {
      return await callGeminiModel(ai.apiKey as string, model, userMessage)
    } catch (error) {
      lastError = error
      if (!(error instanceof GeminiError) || !RETRYABLE_STATUSES.has(error.status)) throw error
      console.warn(`Gemini model ${model} unavailable (${error.status}), trying next model`)
    }
  }
  throw new Error(
    lastError instanceof GeminiError && lastError.status === 429
      ? 'The AI usage limit was reached. Please wait a minute and try again.'
      : 'The AI is very busy right now. Please try again in a minute.'
  )
}

async function callGeminiModel(apiKey: string, model: string, userMessage: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    }
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new GeminiError(data?.error?.message || `Gemini request failed (${res.status})`, res.status)
  return (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('')
}

async function callOpenAI(ai: AiConfig, userMessage: string): Promise<string> {
  const client = new OpenAI({ apiKey: ai.apiKey })
  const completion = await client.chat.completions.create({
    model: ai.model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
  })
  return completion.choices[0]?.message?.content || ''
}

const SYSTEM_PROMPT = `You turn a person's rambling voice note into a clear list of actionable tasks, sorted by how much energy each one needs.

Rules:
- Only extract things the person actually needs or wants to do. Skip feelings, background chatter and repeated mentions.
- Break large or vague goals into concrete next steps (each task should be something you could start right away).
- Keep titles short (max ~8 words), starting with a verb. Put extra context in the description (or "" if none).
- energy:
  - "high": needs deep focus, hard thinking, creativity, emotional effort, or heavy physical exertion (e.g. writing a report, studying, deep cleaning, a workout).
  - "medium": needs some attention or moderate effort but isn't draining (e.g. planning a meeting, grocery shopping, cooking).
  - "low": quick, easy, can be done when tired (e.g. sending a short reply, paying a bill, booking an appointment, taking out the trash).
- energyType: "mental" if it's mostly thinking, "physical" if it's mostly body/movement, "mixed" if it's both.
- urgency: "high" if it has a near deadline or the person sounds stressed about it, "low" if it's a someday/nice-to-have, otherwise "medium".
- estimatedTime: realistic minutes as a whole number.
- dueDate: "YYYY-MM-DD" only if the note mentions a day or deadline (resolve words like "tomorrow" or "Friday" relative to today's date), otherwise null.
- Write in the same language as the note.

Respond with ONLY a JSON object in exactly this shape:
{"tasks": [{"title": string, "description": string, "energy": "high"|"medium"|"low", "energyType": "mental"|"physical"|"mixed", "urgency": "high"|"medium"|"low", "estimatedTime": number, "dueDate": string|null}]}`

const LEVELS = ['high', 'medium', 'low'] as const
const ENERGY_TYPES = ['mental', 'physical', 'mixed'] as const

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function normalizeTasks(raw: unknown): ExtractedTask[] {
  const list = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.tasks) ? (raw as any).tasks : []
  return list
    .filter((t: any) => t && typeof t.title === 'string' && t.title.trim())
    .map((t: any) => ({
      title: t.title.trim(),
      description: typeof t.description === 'string' ? t.description.trim() : '',
      energy: pick(t.energy, LEVELS, 'medium'),
      energyType: pick(t.energyType, ENERGY_TYPES, 'mental'),
      urgency: pick(t.urgency, LEVELS, 'medium'),
      estimatedTime: Math.max(0, Math.round(Number(t.estimatedTime) || 0)),
      dueDate: typeof t.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate) ? t.dueDate : null,
    }))
}

function parseModelJson(content: string): unknown {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
  return JSON.parse(cleaned)
}

async function verifyFirebaseUser(authHeader: string | undefined | null): Promise<boolean> {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return false

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    }
  )
  if (!res.ok) return false
  const data = await res.json()
  return Array.isArray(data.users) && data.users.length > 0
}

export async function handleExtractTasks(
  rawBody: string,
  authHeader: string | undefined | null,
  ai: AiConfig
): Promise<HandlerResult> {
  if (!ai.apiKey) {
    return { status: 500, body: { error: 'AI is not configured. Set GEMINI_API_KEY (or OPENAI_API_KEY) on the server.' } }
  }

  if (!(await verifyFirebaseUser(authHeader))) {
    return { status: 401, body: { error: 'Please log in again to use AI features.' } }
  }

  let note = ''
  let today = new Date().toISOString().slice(0, 10)
  try {
    const parsed = JSON.parse(rawBody || '{}')
    note = typeof parsed.note === 'string' ? parsed.note.trim() : ''
    if (typeof parsed.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.today)) today = parsed.today
  } catch {
    return { status: 400, body: { error: 'Invalid request body.' } }
  }

  if (!note) return { status: 400, body: { error: 'The note is empty.' } }
  if (note.length > MAX_NOTE_LENGTH) {
    return { status: 400, body: { error: `The note is too long (max ${MAX_NOTE_LENGTH} characters).` } }
  }

  try {
    const userMessage = `Today's date is ${today}.\n\nVoice note:\n"""\n${note}\n"""`
    const content = ai.provider === 'gemini' ? await callGemini(ai, userMessage) : await callOpenAI(ai, userMessage)
    const tasks = content ? normalizeTasks(parseModelJson(content)) : []
    return { status: 200, body: { tasks } }
  } catch (error: any) {
    console.error('AI request failed:', error)
    return { status: 502, body: { error: error?.message || 'The AI request failed.' } }
  }
}
