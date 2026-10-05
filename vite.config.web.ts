import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { getAiConfig, handleExtractTasks, type AiConfig } from './server/extractTasks'

// Serves /api/extract-tasks during `vite dev`; on Netlify the same route goes to netlify/functions
function aiApiDevPlugin(ai: AiConfig): Plugin {
  return {
    name: 'taskmate-ai-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/extract-tasks', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        let body = ''
        for await (const chunk of req) body += chunk
        const result = await handleExtractTasks(body, req.headers.authorization, ai)
        res.statusCode = result.status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(result.body))
      })
    },
  }
}

// Web-only Vite config for Netlify deployment
export default defineConfig(({ mode }) => {
  // Empty prefix loads non-VITE_ vars for server-side use only; they are never exposed to the client
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), aiApiDevPlugin(getAiConfig(env))],
    base: './',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
    },
    server: {
      port: 5173,
      host: true
    }
  }
})
