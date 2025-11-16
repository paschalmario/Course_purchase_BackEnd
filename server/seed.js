import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDB } from '../db.js'
import dotenv from 'dotenv'
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Candidate locations for info.json (works whether front-end is in frontend/ or root src/)
const candidates = [
  path.resolve(__dirname, 'src', 'info.json'), // backend/server/src/info.json
  path.resolve(__dirname, '..', 'src', 'info.json'), // backend/src/info.json
  path.resolve(__dirname, '..', '..', 'frontend', 'src', 'info.json'), // ../frontend/src/info.json
  path.resolve(__dirname, '..', '..', 'src', 'info.json'), // ../src/info.json
]

let infoPath = null
for (const p of candidates) {
  if (fs.existsSync(p)) {
    infoPath = p
    break
  }
}

if (!infoPath) {
  console.error('Seed file not found. Tried the following locations:')
  for (const p of candidates) console.error(' -', p)
  process.exit(1)
}

async function seed() {
  try {
    const raw = fs.readFileSync(infoPath, 'utf8')
    const parsed = JSON.parse(raw)
    const docs = Array.isArray(parsed.Courses) ? parsed.Courses : []
    if (!docs.length) {
      console.error('No Courses array found in', infoPath)
      process.exit(1)
    }

    const db = await connectDB()
    const col = db.collection('courses')

    await col.deleteMany({})
    await col.insertMany(docs)
    const count = await col.countDocuments()
    console.log(`Seed complete. Inserted ${count} documents into 'courses'.`)
    process.exit(0)
  } catch (err) {
    console.error('Seeding failed:', err)
    process.exit(1)
  }
}

seed()
