import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import User from '../models/User.model'
import Membership from '../models/Membership.model'
import Payment from '../models/Payment.model'
import Course from '../models/Course.model'
import AIGeneratedContent from '../models/AIGeneratedContent.model'
import AIRecommendation from '../models/AIRecommendation.model'
import bcrypt from 'bcryptjs'
import { getCacheStats, getCacheHitRate } from '../services/cache-stats.service'

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query

    const query: any = {}
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ]
    }
    if (role) {
      query.role = role
    }

    const skip = (Number(page) - 1) * Number(limit)

    const users = await User.find(query)
      .select('-password')
      .populate('currentMembership')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })

    const total = await User.countDocuments(query)

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message })
  }
}

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const user = await User.findById(id)
      .select('-password')
      .populate('currentMembership')
      .populate('enrolledCourses')

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    // Obtener historial de membresías
    const memberships = await Membership.find({ user: id })
      .populate('paymentId')
      .sort({ createdAt: -1 })

    res.json({
      user,
      memberships
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener usuario', error: error.message })
  }
}

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, email, fullName, role = 'student' } = req.body

    if (!username || !password) {
      return res.status(400).json({ message: 'Username y password son requeridos' })
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe' })
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear usuario
    const user = new User({
      username,
      password: hashedPassword,
      email,
      fullName,
      role
    })

    await user.save()

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al crear usuario', error: error.message })
  }
}

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { email, fullName, role, password } = req.body

    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    if (email) user.email = email
    if (fullName) user.fullName = fullName
    if (role) user.role = role
    if (password) {
      user.password = await bcrypt.hash(password, 10)
    }

    await user.save()

    res.json({
      message: 'Usuario actualizado exitosamente',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al actualizar usuario', error: error.message })
  }
}

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    await User.findByIdAndDelete(id)

    res.json({ message: 'Usuario eliminado exitosamente' })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al eliminar usuario', error: error.message })
  }
}

export const getAllMemberships = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status = '', userId = '' } = req.query

    const query: any = {}
    if (status) query.status = status
    if (userId) query.user = userId

    const skip = (Number(page) - 1) * Number(limit)

    const memberships = await Membership.find(query)
      .populate('user', 'username email fullName')
      .populate('paymentId')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })

    const total = await Membership.countDocuments(query)

    res.json({
      memberships,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener membresías', error: error.message })
  }
}

export const updateMembership = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status, endDate, autoRenew } = req.body

    const membership = await Membership.findById(id)
    if (!membership) {
      return res.status(404).json({ message: 'Membresía no encontrada' })
    }

    if (status) membership.status = status
    if (endDate) membership.endDate = new Date(endDate)
    if (autoRenew !== undefined) membership.autoRenew = autoRenew

    await membership.save()

    // Actualizar estado del usuario si es necesario
    if (status === 'active') {
      const user = await User.findById(membership.user)
      if (user) {
        user.currentMembership = membership._id
        user.hasActiveMembership = true
        await user.save()
      }
    }

    res.json({
      message: 'Membresía actualizada exitosamente',
      membership
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al actualizar membresía', error: error.message })
  }
}

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await User.countDocuments()
    const totalStudents = await User.countDocuments({ role: 'student' })
    const activeMemberships = await Membership.countDocuments({ status: 'active' })
    const totalPayments = await Payment.countDocuments({ status: 'completed' })
    
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0

    const membershipsByType = await Membership.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ])

    const recentPayments = await Payment.find({ status: 'completed' })
      .populate('user', 'username email')
      .populate('membership')
      .sort({ paymentDate: -1 })
      .limit(10)

    res.json({
      stats: {
        totalUsers,
        totalStudents,
        activeMemberships,
        totalPayments,
        revenue
      },
      membershipsByType,
      recentPayments
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message })
  }
}

export const getAIUsageStats = async (req: AuthRequest, res: Response) => {
  try {
    const { period = '30' } = req.query // días
    const days = parseInt(period as string)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Estadísticas de contenido generado
    const contentStats = await AIGeneratedContent.aggregate([
      {
        $match: {
          'metadata.generatedAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$contentType',
          count: { $sum: 1 },
          totalTokens: { $sum: { $ifNull: ['$metadata.tokensUsed', 0] } },
          totalUsage: { $sum: '$metadata.usageCount' },
          avgTokens: { $avg: { $ifNull: ['$metadata.tokensUsed', 0] } }
        }
      }
    ])

    // Estadísticas de recomendaciones
    const recommendationStats = await AIRecommendation.aggregate([
      {
        $match: {
          'metadata.generatedAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalTokens: { $sum: { $ifNull: ['$metadata.tokensUsed', 0] } },
          totalUsage: { $sum: '$metadata.usageCount' }
        }
      }
    ])

    // Estadísticas por modelo
    const modelStats = await AIGeneratedContent.aggregate([
      {
        $match: {
          'metadata.generatedAt': { $gte: startDate },
          'metadata.modelUsed': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$metadata.modelUsed',
          count: { $sum: 1 },
          totalTokens: { $sum: { $ifNull: ['$metadata.tokensUsed', 0] } }
        }
      }
    ])

    // Estadísticas de cache
    const cacheStats = await AIGeneratedContent.aggregate([
      {
        $match: {
          'metadata.generatedAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalGenerated: { $sum: 1 },
          totalCacheHits: { $sum: '$metadata.usageCount' },
          avgUsagePerItem: { $avg: '$metadata.usageCount' }
        }
      }
    ])

    // Estadísticas diarias (últimos 30 días)
    const dailyStats = await AIGeneratedContent.aggregate([
      {
        $match: {
          'metadata.generatedAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$metadata.generatedAt' }
          },
          count: { $sum: 1 },
          tokens: { $sum: { $ifNull: ['$metadata.tokensUsed', 0] } }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ])

    // Calcular totales
    const totalContent = await AIGeneratedContent.countDocuments({
      'metadata.generatedAt': { $gte: startDate }
    })
    const totalRecommendations = recommendationStats[0]?.count || 0
    const totalTokens = contentStats.reduce((sum, stat) => sum + (stat.totalTokens || 0), 0) +
                       (recommendationStats[0]?.totalTokens || 0)
    const totalCacheHits = cacheStats[0]?.totalCacheHits || 0

    // Obtener estadísticas en tiempo real de cache vs API
    const realTimeStats = getCacheStats()
    const cacheHitRate = getCacheHitRate()

    // Calcular costo basado en precios reales de OpenAI (por millón de tokens)
    // Precios actuales (2024):
    // - gpt-3.5-turbo: $0.50 entrada / $1.50 salida por 1M tokens
    // - gpt-4o-mini: $0.80 entrada / $3.20 salida por 1M tokens
    // Estimación: ~30% entrada, 70% salida (promedio típico en conversaciones)
    const estimatedCost = modelStats.reduce((cost, stat) => {
      const model = stat._id || ''
      const tokens = stat.totalTokens || 0
      
      // Precios por millón de tokens
      let inputPricePer1M = 0.5  // default gpt-3.5-turbo
      let outputPricePer1M = 1.5
      
      if (model.includes('gpt-4o-mini') || model.includes('gpt-4o')) {
        // gpt-4o-mini: $0.80 entrada / $3.20 salida por 1M tokens
        inputPricePer1M = 0.80
        outputPricePer1M = 3.20
      } else if (model.includes('gpt-4')) {
        // gpt-4 (si se usa): más caro
        inputPricePer1M = 10.0
        outputPricePer1M = 30.0
      } else if (model.includes('gpt-3.5-turbo')) {
        // gpt-3.5-turbo: $0.50 entrada / $1.50 salida por 1M tokens
        inputPricePer1M = 0.50
        outputPricePer1M = 1.50
      }
      
      // Estimar distribución: 30% entrada, 70% salida
      const inputTokens = tokens * 0.3
      const outputTokens = tokens * 0.7
      
      // Calcular costo: (tokens / 1,000,000) * precio
      const inputCost = (inputTokens / 1_000_000) * inputPricePer1M
      const outputCost = (outputTokens / 1_000_000) * outputPricePer1M
      
      return cost + inputCost + outputCost
    }, 0)

    res.json({
      period: days,
      summary: {
        totalContentGenerated: totalContent,
        totalRecommendations,
        totalTokens,
        totalCacheHits,
        estimatedCostUSD: estimatedCost,
        cacheHitRate: totalContent > 0 ? ((totalCacheHits / totalContent) * 100).toFixed(2) : '0.00'
      },
      realTimeStats: {
        cacheHits: realTimeStats.cacheHits,
        apiCalls: realTimeStats.apiCalls,
        cacheHitRate: cacheHitRate.toFixed(2),
        lastReset: realTimeStats.lastReset
      },
      byContentType: contentStats,
      byModel: modelStats,
      dailyStats,
      cacheStats: cacheStats[0] || {
        totalGenerated: 0,
        totalCacheHits: 0,
        avgUsagePerItem: 0
      }
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener estadísticas de IA', error: error.message })
  }
}

