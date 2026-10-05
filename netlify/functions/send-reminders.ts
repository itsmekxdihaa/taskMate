import { sendDueReminders } from '../../server/reminders'

export default async () => {
  const result = await sendDueReminders(
    { clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY },
    process.env.URL
  )
  console.log('Reminders run:', result)
}

export const config = {
  schedule: '*/5 * * * *',
}
