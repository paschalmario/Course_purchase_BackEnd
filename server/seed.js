import fs from 'fs'
import path from 'path'
import { connectDB } from './db.js'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// candidate locations to find src/info.json
const candidates = [
  path.resolve(process.cwd(), 'src', 'info.json'), // when run from project root
  path.resolve(process.cwd(), '..', 'src', 'info.json'), // when run from server/ with cwd = server
  path.resolve(__dirname, '..', 'src', 'info.json'), // server/../src/info.json
  path.resolve(__dirname, 'src', 'info.json'), // server/src/info.json (unlikely but safe)
]

let filePath = null
for (const p of candidates) {
  if (fs.existsSync(p)) {
    filePath = p
    break
  }
}

if (!filePath) {
  console.error('Seed file not found. Tried the following locations:')
  for (const p of candidates) console.error(' -', p)
  process.exit(1)
}

async function seed() {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(raw)
    const docs = Array.isArray(data.Courses) ? data.Courses : []
    if (!docs.length) {
      console.error('No courses found in info.json at', filePath)
      process.exit(1)
    }

    const db = await connectDB()
    const col = db.collection('courses')
    await col.deleteMany({})
    await col.insertMany(docs)
    const count = await col.countDocuments()
    console.log('Seed complete, documents:', count)
    process.exit(0)
  } catch (err) {
    console.error('Seeding failed', err)
    process.exit(1)
  }
}

seed()
