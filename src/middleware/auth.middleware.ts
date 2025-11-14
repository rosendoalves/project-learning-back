import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: string
  userRole?: string
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'No token provided' })
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'default_secret'
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string }

    req.userId = decoded.userId
    req.userRole = decoded.role
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    next()
  }
}

// Exportar requireRole como función directa también
export { requireRole as requireRoleMiddleware }

