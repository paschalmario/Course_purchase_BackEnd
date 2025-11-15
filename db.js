import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// load backend/.env first, then project-level .env if needed
const envPaths = [path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), '.env.local')]
for (const p of envPaths) {
  if (fs.existsSync(p)) dotenv.config({ path: p })
}
dotenv.config()

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('ERROR: MONGODB_URI is not set. Create backend/.env with MONGODB_URI.')
  process.exit(1)
}

const client = new MongoClient(uri)
let dbInstance = null

export async function connectDB(dbName = 'course_app') {
  if (!dbInstance) {
    await client.connect()
    dbInstance = client.db(dbName)
    console.log('Connected to MongoDB:', dbName)
  }
  return dbInstance
}

export function getClient() {
  return client
}
