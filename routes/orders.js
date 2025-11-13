import express from 'express'
import { connectDB } from '../db.js'

const router = express.Router()

// GET /api/orders (optional) - list orders for testing
router.get('/orders', async (req, res) => {
  try {
    const db = await connectDB()
    const orders = await db.collection('orders').find({}).toArray()
    res.json(orders)
  } catch (err) {
    console.error('GET /orders error', err)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

// POST /api/orders
// body: { name: string, phone: string, items: [{ id: number, quantity: number }] }
router.post('/orders', async (req, res) => {
  try {
    const { name, phone, items } = req.body || {}
    if (!name || !phone || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid order payload' })
    }

    const db = await connectDB()
    const coursesCol = db.collection('courses')
    const reserved = []

    // reserve spaces for each item atomically
    for (const it of items) {
      const id = Number(it.id)
      const qty = Number(it.quantity) || 0
      if (!id || qty <= 0) {
        // rollback previous reservations
        for (const r of reserved) {
          await coursesCol.updateOne({ id: r.id }, { $inc: { spaces: r.qty } })
        }
        return res.status(400).json({ error: 'Invalid item in order' })
      }

      const update = await coursesCol.findOneAndUpdate(
        { id, spaces: { $gte: qty } },
        { $inc: { spaces: -qty } },
        { returnDocument: 'after' },
      )
      if (!update.value) {
        // rollback
        for (const r of reserved) {
          await coursesCol.updateOne({ id: r.id }, { $inc: { spaces: r.qty } })
        }
        return res.status(400).json({ error: `Not enough spaces for lesson id ${id}` })
      }
      reserved.push({ id, qty })
    }

    // insert order
    const ordersCol = db.collection('orders')
    const order = {
      name: String(name).trim(),
      phone: String(phone).trim(),
      items: items.map((i) => ({ id: Number(i.id), quantity: Number(i.quantity) })),
      createdAt: new Date(),
    }
    const r = await ordersCol.insertOne(order)
    res.json({ ok: true, orderId: r.insertedId })
  } catch (err) {
    console.error('POST /orders error', err)
    res.status(500).json({ error: 'Order creation failed' })
  }
})

export default router
