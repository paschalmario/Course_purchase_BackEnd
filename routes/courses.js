import express from 'express'
import { connectDB } from '../db.js'

const router = express.Router()

// GET /api/lessons -> return all lessons
router.get('/lessons', async (req, res) => {
  try {
    const db = await connectDB()
    const lessons = await db.collection('courses').find({}).toArray()
    res.json(lessons)
  } catch (err) {
    console.error('GET /api/lessons error', err)
    res.status(500).json({ error: 'Failed to fetch lessons' })
  }
})

// GET /api/search?q=term -> simple text search across subject/location/price/spaces
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim()
    if (!q) return res.json([])
    const db = await connectDB()
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const num = Number(q)
    const or = [{ subject: { $regex: regex } }, { location: { $regex: regex } }]
    if (!Number.isNaN(num)) {
      or.push({ price: num }, { spaces: num })
    }
    const results = await db.collection('courses').find({ $or: or }).toArray()
    res.json(results)
  } catch (err) {
    console.error('GET /api/search error', err)
    res.status(500).json({ error: 'Search failed' })
  }
})

// PUT /api/lessons/:id -> update any lesson attributes (e.g., spaces)
router.put('/lessons/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid lesson id' })
    const updates = req.body && typeof req.body === 'object' ? req.body : {}
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No updates provided' })

    // sanitize numeric fields
    if ('spaces' in updates) {
      const sp = Number(updates.spaces)
      if (Number.isNaN(sp) || sp < 0) return res.status(400).json({ error: 'Invalid spaces value' })
      updates.spaces = sp
    }
    if ('price' in updates) {
      const p = Number(updates.price)
      if (Number.isNaN(p) || p < 0) return res.status(400).json({ error: 'Invalid price value' })
      updates.price = p
    }

    const db = await connectDB()
    const result = await db
      .collection('courses')
      .findOneAndUpdate({ id }, { $set: updates }, { returnDocument: 'after' })
    if (!result.value) return res.status(404).json({ error: 'Lesson not found' })
    res.json({ ok: true, lesson: result.value })
  } catch (err) {
    console.error('PUT /api/lessons/:id error', err)
    res.status(500).json({ error: 'Failed to update lesson' })
  }
})

// Dev-only: POST /api/courses/seed -> expects array body to replace collection
router.post('/courses/seed', async (req, res) => {
  try {
    const data = Array.isArray(req.body) ? req.body : []
    if (!data.length) return res.status(400).json({ error: 'No data provided' })
    const db = await connectDB()
    await db.collection('courses').deleteMany({})
    await db.collection('courses').insertMany(data)
    const count = await db.collection('courses').countDocuments()
    res.json({ ok: true, count })
  } catch (err) {
    console.error('POST /api/courses/seed error', err)
    res.status(500).json({ error: 'Seed failed' })
  }
})

export default router
