import express from 'express'
import { connectDB } from '../db.js'

const router = express.Router()

// GET /api/lessons  -> return all lessons
router.get('/lessons', async (req, res) => {
  try {
    const db = await connectDB()
    const lessons = await db.collection('courses').find({}).toArray()
    res.json(lessons)
  } catch (err) {
    console.error('GET /lessons error', err)
    res.status(500).json({ error: 'Failed to fetch lessons' })
  }
})

// GET /api/search?q=term  -> simple text search across subject/location/price/spaces
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
    console.error('GET /search error', err)
    res.status(500).json({ error: 'Search failed' })
  }
})

// PUT /api/lessons/:id  -> update lesson fields (e.g., set spaces)
router.put('/lessons/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' })

    const updates = req.body || {}
    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'No updates provided' })

    const db = await connectDB()
    const result = await db
      .collection('courses')
      .findOneAndUpdate({ id }, { $set: updates }, { returnDocument: 'after' })
    if (!result.value) return res.status(404).json({ error: 'Lesson not found' })
    res.json({ ok: true, lesson: result.value })
  } catch (err) {
    console.error('PUT /lessons/:id error', err)
    res.status(500).json({ error: 'Update failed' })
  }
})

// Dev: seed courses collection (POST body = array of lessons)
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
    console.error('POST /courses/seed error', err)
    res.status(500).json({ error: 'Seed failed' })
  }
})

export default router
