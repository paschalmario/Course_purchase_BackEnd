import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB, getClient } from '../db.js'
import coursesRouter from '../routes/courses.js'
import ordersRouter from '../routes/orders.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api', coursesRouter)
app.use('/api', ordersRouter)

app.get('/health', (req, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 3000

async function start() {
  try {
    await connectDB()
    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err)
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
