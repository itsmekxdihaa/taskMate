import { getAiConfig, handleExtractTasks } from '../../server/extractTasks'

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const result = await handleExtractTasks(
    await req.text(),
    req.headers.get('authorization'),
    getAiConfig(process.env)
  )
  return json(result.body, result.status)
}
