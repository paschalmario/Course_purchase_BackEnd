import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath, pathToFileURL } from 'url'
import path from 'path'
import fs from 'fs'
import { connectDB, getClient } from './db.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// --- Middleware: Request Logger ---
app.use((req, res, next) => {
  const now = new Date().toISOString()
  const ip = req.ip || req.connection.remoteAddress || 'unknown'
  console.log(`[${now}] ${req.method} ${req.originalUrl} from ${ip}`)
  next()
})

// --- Middleware: Core ---
app.use(cors())
app.use(express.json())

// --- Static Files (Images) ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const imagesDir = path.resolve(__dirname, 'public', 'images')

app.get('/images/:filename', (req, res) => {
  const filename = req.params.filename
  const filePath = path.join(imagesDir, filename)
  res.setHeader('Cache-Control', 'public, max-age=300')

  try {
    if (!filePath.startsWith(imagesDir)) {
      return res.status(400).json({ error: 'Invalid filename' })
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Image not found' })
    }

    return res.sendFile(filePath)
  } catch (err) {
    console.error('Error serving image:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// --- Note: route imports are loaded dynamically in start() ---
// This avoids ERR_MODULE_NOT_FOUND after moving files between backend/ and backend/server/

// --- Frontend Serving (for production) ---
const frontendDist = path.resolve(__dirname, '..', 'dist')
if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))

  // Fallback for SPA routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

// --- Health Check Route ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV })
})

// --- Helper: try to find a file from candidate locations ---
function findExistingFile(candidates) {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return null
}

// --- Start Server (connect DB first) ---
async function start() {
  try {
    await connectDB()

    // After DB is connected, dynamically locate and import routers.
    // We support both layouts:
    //  - backend/server/routes/*.js  (routes inside the server folder)
    //  - backend/routes/*.js         (routes at backend root)
    const candidatesBase = [
      path.resolve(__dirname, 'routes'), // backend/server/routes
      path.resolve(__dirname, '..', 'routes'), // backend/routes
    ]

    // Build candidate paths for courses and orders
    const coursesCandidates = candidatesBase.map((dir) => path.join(dir, 'courses.js'))
    const ordersCandidates = candidatesBase.map((dir) => path.join(dir, 'orders.js'))

    const coursesPath = findExistingFile(coursesCandidates)
    const ordersPath = findExistingFile(ordersCandidates)

    if (coursesPath) {
      try {
        const coursesModule = await import(pathToFileURL(coursesPath).href)
        if (coursesModule && coursesModule.default) {
          app.use('/api', coursesModule.default)
          console.log(`Mounted courses router from ${coursesPath}`)
        } else {
          console.warn(`Courses module loaded but no default export: ${coursesPath}`)
        }
      } catch (err) {
        console.error('Failed to import courses router:', err)
      }
    } else {
      console.warn('courses.js not found in expected locations:', coursesCandidates)
    }

    if (ordersPath) {
      try {
        const ordersModule = await import(pathToFileURL(ordersPath).href)
        if (ordersModule && ordersModule.default) {
          app.use('/api', ordersModule.default)
          console.log(`Mounted orders router from ${ordersPath}`)
        } else {
          console.warn(`Orders module loaded but no default export: ${ordersPath}`)
        }
      } catch (err) {
        console.error('Failed to import orders router:', err)
      }
    } else {
      console.warn('orders.js not found in expected locations:', ordersCandidates)
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`)
    })
  } catch (err) {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
  }
}

start()

// --- Graceful Shutdown ---
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...')
  try {
    await getClient().close()
  } catch (e) {
    console.error('Error closing DB connection:', e)
  }
  process.exit(0)
})
