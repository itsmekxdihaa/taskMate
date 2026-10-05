import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

const PROJECT_ID = 'taskmate-app-c6314'
const MAX_REMINDERS_PER_RUN = 200
const DEAD_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
])

type Credentials = { clientEmail?: string; privateKey?: string }

function getAdminApp({ clientEmail, privateKey }: Credentials) {
  if (getApps().length) return getApps()[0]
  if (!clientEmail || !privateKey) {
    throw new Error('Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY')
  }
  return initializeApp({
    credential: cert({
      projectId: PROJECT_ID,
      clientEmail,
      // Env vars store the key's newlines as literal "\n"
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  })
}

function reminderBody(minutesBefore: number | undefined) {
  if (!minutesBefore) return "It's due now."
  if (minutesBefore < 60) return `Due in ${minutesBefore} minutes.`
  if (minutesBefore < 1440) {
    const hours = Math.round(minutesBefore / 60)
    return `Due in ${hours} hour${hours === 1 ? '' : 's'}.`
  }
  return 'Due tomorrow.'
}

export async function sendDueReminders(credentials: Credentials, siteUrl?: string) {
  const app = getAdminApp(credentials)
  const db = getFirestore(app)
  const messaging = getMessaging(app)
  const now = new Date().toISOString()

  // Sent reminders have remindAt removed, so this only finds pending ones
  const due = await db
    .collection('tasks')
    .where('remindAt', '<=', now)
    .limit(MAX_REMINDERS_PER_RUN)
    .get()

  const tokensByUser = new Map<string, { id: string; token: string }[]>()
  let sent = 0

  for (const taskDoc of due.docs) {
    const task = taskDoc.data()

    if (!task.completed && task.userId) {
      if (!tokensByUser.has(task.userId)) {
        const tokenDocs = await db.collection('pushTokens').where('userId', '==', task.userId).get()
        tokensByUser.set(task.userId, tokenDocs.docs.map(d => ({ id: d.id, token: d.get('token') })))
      }
      const tokens = tokensByUser.get(task.userId)!

      if (tokens.length) {
        const result = await messaging.sendEachForMulticast({
          tokens: tokens.map(t => t.token),
          notification: { title: `Reminder: ${task.title}`, body: reminderBody(task.reminderMinutes) },
          webpush: siteUrl?.startsWith('https://') ? { fcmOptions: { link: siteUrl } } : undefined,
        })
        sent += result.successCount

        const deadTokens = result.responses
          .map((r, i) => (r.error && DEAD_TOKEN_ERRORS.has(r.error.code) ? tokens[i] : null))
          .filter((t): t is { id: string; token: string } => t !== null)
        await Promise.all(deadTokens.map(t => db.collection('pushTokens').doc(t.id).delete()))
        tokensByUser.set(task.userId, tokens.filter(t => !deadTokens.includes(t)))
      }
    }

    await taskDoc.ref.update({ remindAt: FieldValue.delete(), reminderSentAt: now })
  }

  return { checked: due.size, sent }
}
