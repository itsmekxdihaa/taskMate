// Runs one reminder check. GitHub Actions runs this every 5 minutes; locally it reads .env
import { existsSync, readFileSync } from 'node:fs'
import { sendDueReminders } from '../server/reminders'

const env: Record<string, string | undefined> = { ...process.env }
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (match && !env[match[1]]) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
  }
}

sendDueReminders({ clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: env.FIREBASE_PRIVATE_KEY }, env.SITE_URL)
  .then(result => console.log('Reminders run:', result))
  .catch(error => {
    console.error(error.message)
    process.exit(1)
  })
