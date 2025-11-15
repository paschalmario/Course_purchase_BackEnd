import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { connectDB, getClient } from '../db.js'
import coursesRouter from '../routes/courses.js'
import ordersRouter from '../routes/orders.js'

dotenv.config()

const app = express()

// Simple logger for requests (useful for debugging on Render)
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl)
  next()
})

app.use(cors())
app.use(express.json())

// Optional: serve lesson images placed in backend/public/images
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const imagesDir = path.resolve(__dirname, '..', 'public', 'images')
app.get('/images/:name', (req, res) => {
  const name = req.params.name || ''
  const filePath = path.join(imagesDir, name)
  if (!filePath.startsWith(imagesDir) || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image not found' })
  }
  res.sendFile(filePath)
})

// Mount your API routers under /api
app.use('/api', coursesRouter)
app.use('/api', ordersRouter)

// Health check route (Render uses this to verify the service)
app.get('/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' })
})

// Start server after connecting to DB
const PORT = Number(process.env.PORT) || 3000
async function start() {
  try {
    await connectDB() // will throw if MONGODB_URI missing or connection fails
    // Listen on 0.0.0.0 so external services (Render) can reach the process
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Backend listening on port ${PORT}`)
    })
  } catch (err) {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
  }
}

start()

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...')
  try {
    await getClient().close()
  } catch (e) {
    console.error('Error closing DB client:', e)
  } finally {
    process.exit(0)
  }
})
