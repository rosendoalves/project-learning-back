import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import Membership, { MembershipType } from '../models/Membership.model'
import Payment from '../models/Payment.model'
import User from '../models/User.model'

// Precios de membresías (en USD según propuesta estratégica)
// Convertidos a ARS usando tasa de referencia (ajustar según dólar oficial)
const USD_TO_ARS = 1000 // Tasa de conversión (ajustar según dólar oficial)

const MEMBERSHIP_PRICES: Record<MembershipType, number> = {
  weekly: 7 * USD_TO_ARS,        // $7 USD = $7,000 ARS
  monthly: 19.99 * USD_TO_ARS,   // $19.99 USD = $19,990 ARS
  quarterly: 49.99 * USD_TO_ARS, // $49.99 USD = $49,990 ARS (total trimestre)
  semiannual: 89.99 * USD_TO_ARS, // $89.99 USD = $89,990 ARS (total semestre)
  annual: 143.88 * USD_TO_ARS    // $143.88 USD = $143,880 ARS (total anual)
}

// Duración en días
const MEMBERSHIP_DURATION: Record<MembershipType, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  semiannual: 180,
  annual: 365
}

export const getMembershipPlans = async (req: AuthRequest, res: Response) => {
  try {
    const plans = Object.entries(MEMBERSHIP_PRICES).map(([type, price]) => ({
      type: type as MembershipType,
      name: getMembershipName(type as MembershipType),
      price,
      duration: MEMBERSHIP_DURATION[type as MembershipType],
      currency: 'ARS'
    }))

    res.json({ plans })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener planes', error: error.message })
  }
}

export const getCurrentMembership = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' })
    }

    const user = await User.findById(req.userId).populate('currentMembership')
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    if (!user.currentMembership) {
      return res.json({ membership: null, hasActiveMembership: false })
    }

    const membership = await Membership.findById(user.currentMembership)
      .populate('paymentId')

    if (!membership) {
      return res.json({ membership: null, hasActiveMembership: false })
    }

    const now = new Date()
    const isActive = membership.status === 'active' && membership.endDate > now

    res.json({
      membership,
      hasActiveMembership: isActive,
      daysRemaining: isActive
        ? Math.ceil((membership.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener membresía', error: error.message })
  }
}

export const createMembership = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' })
    }

    const { type, paymentMethod, transactionId } = req.body

    if (!type || !MEMBERSHIP_PRICES[type as MembershipType]) {
      return res.status(400).json({ message: 'Tipo de membresía inválido' })
    }

    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    const price = MEMBERSHIP_PRICES[type as MembershipType]
    const duration = MEMBERSHIP_DURATION[type as MembershipType]

    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + duration)

    // Crear membresía
    const membership = new Membership({
      user: req.userId,
      type: type as MembershipType,
      status: 'pending',
      startDate,
      endDate,
      price,
      currency: 'ARS'
    })

    await membership.save()

    // Crear pago
    const payment = new Payment({
      user: req.userId,
      membership: membership._id,
      amount: price,
      currency: 'ARS',
      status: 'pending',
      paymentMethod: paymentMethod || 'other',
      transactionId: transactionId || `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    })

    await payment.save()

    membership.paymentId = payment._id
    await membership.save()

    res.status(201).json({
      message: 'Membresía creada, pendiente de pago',
      membership,
      payment
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al crear membresía', error: error.message })
  }
}

export const confirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' })
    }

    const { paymentId, externalPaymentId } = req.body

    const payment = await Payment.findById(paymentId)
    if (!payment) {
      return res.status(404).json({ message: 'Pago no encontrado' })
    }

    if (payment.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'No tienes permiso para este pago' })
    }

    // Actualizar pago
    payment.status = 'completed'
    payment.paymentDate = new Date()
    if (externalPaymentId) {
      payment.externalPaymentId = externalPaymentId
    }
    await payment.save()

    // Activar membresía
    const membership = await Membership.findById(payment.membership)
    if (!membership) {
      return res.status(404).json({ message: 'Membresía no encontrada' })
    }

    // Desactivar membresía anterior si existe
    const user = await User.findById(req.userId)
    if (user && user.currentMembership) {
      const oldMembership = await Membership.findById(user.currentMembership)
      if (oldMembership) {
        oldMembership.status = 'cancelled'
        await oldMembership.save()
      }
    }

    membership.status = 'active'
    await membership.save()

    // Actualizar usuario
    if (user) {
      user.currentMembership = membership._id
      user.hasActiveMembership = true
      await user.save()
    }

    res.json({
      message: 'Pago confirmado y membresía activada',
      membership,
      payment
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al confirmar pago', error: error.message })
  }
}

export const getMembershipHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' })
    }

    const memberships = await Membership.find({ user: req.userId })
      .populate('paymentId')
      .sort({ createdAt: -1 })

    res.json({ memberships })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener historial', error: error.message })
  }
}

function getMembershipName(type: MembershipType): string {
  const names = {
    weekly: 'Semanal',
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    semiannual: 'Semestral',
    annual: 'Anual'
  }
  return names[type]
}

