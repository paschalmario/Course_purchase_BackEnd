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

app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.originalUrl)
  next()
})
app.use(cors())
app.use(express.json())

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const imagesDir = path.resolve(__dirname, '..', 'public', 'images')

app.get('/images/:name', (req, res) => {
  const file = path.join(imagesDir, req.params.name || '')
  if (!file.startsWith(imagesDir) || !fs.existsSync(file))
    return res.status(404).json({ error: 'Image not found' })
  res.sendFile(file)
})

app.use('/api', coursesRouter)
app.use('/api', ordersRouter)

app.get('/health', (req, res) => res.json({ ok: true }))

async function start() {
  try {
    await connectDB()
    app.listen(PORT, () => console.log(`Backend listening on ${PORT}`))
  } catch (err) {
    console.error('Failed to start', err)
    process.exit(1)
  }
}
start()

process.on('SIGINT', async () => {
  try {
    await getClient().close()
  } catch (e) {}
  process.exit(0)
})
