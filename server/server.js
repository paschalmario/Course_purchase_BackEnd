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
const PORT = process.env.PORT || 3000

// Simple logger middleware
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl)
  next()
})

// Core middleware
app.use(cors())
app.use(express.json())

// Serve images from backend/public/images (optional)
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

// Mount API routers
app.use('/api', coursesRouter)
app.use('/api', ordersRouter)

// Health-check
app.get('/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }))

// Start server after DB connects
async function start() {
  try {
    await connectDB()
    app.listen(PORT, () => {
      console.log(`Backend listening on http://localhost:${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start backend:', err)
    process.exit(1)
  }
}

start()

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...')
  try {
    await getClient().close()
  } catch (e) {
    console.error('Error closing DB client', e)
  }
  process.exit(0)
})
