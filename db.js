import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
dotenv.config()

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('ERROR: MONGODB_URI not set in backend/.env')
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
