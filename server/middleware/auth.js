import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRETT = process.env.JWT_SECRET || 'chajoo_bot_2026_secret_key'

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRETT, { expiresIn: '30d' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRETT)
  } catch {
    return null
  }
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' })
  }
  const token = authHeader.slice(7)
  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
  req.user = decoded
  req.userId = decoded.userId || decoded.id
  next()
}
