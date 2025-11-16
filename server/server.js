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

// simple request logger
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl)
  next()
})

app.use(cors())
app.use(express.json())

// serve images from backend/public/images (optional)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const imagesDir = path.resolve(__dirname, '..', 'public', 'images')
app.get('/images/:filename', (req, res) => {
  const filename = req.params.filename || ''
  const filePath = path.join(imagesDir, filename)
  if (!filePath.startsWith(imagesDir) || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image not found' })
  }
  res.sendFile(filePath)
})

// mount API routers
app.use('/api', coursesRouter)
app.use('/api', ordersRouter)

// health check for Render / monitoring
app.get('/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }))

// start server after DB connection
const PORT = Number(process.env.PORT) || 3000
async function start() {
  try {
    await connectDB()
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend listening on port ${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()

// graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...')
  try {
    await getClient().close()
  } catch (e) {}
  process.exit(0)
})
