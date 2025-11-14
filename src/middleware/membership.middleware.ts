import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth.middleware'
import User from '../models/User.model'
import Membership from '../models/Membership.model'

export const requireActiveMembership = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' })
    }

    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    // Si es admin o teacher, permitir acceso sin membresía
    if (user.role === 'admin' || user.role === 'teacher') {
      return next()
    }

    // Verificar si tiene membresía activa
    if (!user.hasActiveMembership && !user.currentMembership) {
      return res.status(403).json({
        message: 'No tienes una suscripción activa',
        code: 'NO_MEMBERSHIP',
        requiresMembership: true
      })
    }

    // Verificar que la membresía esté activa
    if (user.currentMembership) {
      const membership = await Membership.findById(user.currentMembership)
      if (!membership) {
        return res.status(403).json({
          message: 'Membresía no encontrada',
          code: 'MEMBERSHIP_NOT_FOUND',
          requiresMembership: true
        })
      }

      const now = new Date()
      if (membership.status !== 'active' || membership.endDate < now) {
        // Actualizar estado del usuario
        user.hasActiveMembership = false
        user.currentMembership = undefined
        await user.save()

        membership.status = 'expired'
        await membership.save()

        return res.status(403).json({
          message: 'Tu suscripción ha expirado',
          code: 'MEMBERSHIP_EXPIRED',
          requiresMembership: true,
          expiredDate: membership.endDate
        })
      }
    }

    next()
  } catch (error: any) {
    res.status(500).json({ message: 'Error al verificar membresía', error: error.message })
  }
}

