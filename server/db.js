import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Try loading .env from a few likely locations so starting node from different folders still works
// 1) default (process.cwd())
// 2) parent folder of cwd (useful when running `node server/server.js` from project root)
// 3) project root relative to this file (useful when running `node server.js` inside server/)
dotenv.config()

const cwd = process.cwd()
const tried = []

if (!process.env.MONGODB_URI) {
  const parentEnv = path.resolve(cwd, '..', '.env')
  tried.push(parentEnv)
  dotenv.config({ path: parentEnv })
}

if (!process.env.MONGODB_URI) {
  // resolve project root relative to this file (server/..)
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const projectRootEnv = path.resolve(__dirname, '..', '.env')
  tried.push(projectRootEnv)
  dotenv.config({ path: projectRootEnv })
}

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('\nERROR: MONGODB_URI not set in environment (.env)')
  console.error('Tried loading .env from these locations:')
  console.error(' -', path.resolve(cwd, '.env'))
  for (const p of tried) console.error(' -', p)
  console.error('\nCreate a .env file at the project root with:')
  console.error('  MONGODB_URI="your_mongodb_atlas_connection_string"\n')
  // exit so server doesn't attempt to start with missing config
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
