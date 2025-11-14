import cron from 'node-cron'
import Membership from '../models/Membership.model'
import User from '../models/User.model'

/**
 * Job que se ejecuta cada hora para verificar y expirar membresías vencidas
 * Ejecuta: cada hora a los 0 minutos (ej: 1:00, 2:00, 3:00...)
 */
export const startMembershipExpirationJob = () => {
  // Ejecutar cada hora
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('🔄 Ejecutando job de expiración de membresías...')
      
      const now = new Date()
      
      // Buscar membresías activas que hayan expirado
      const expiredMemberships = await Membership.find({
        status: 'active',
        endDate: { $lt: now }
      }).populate('user')

      if (expiredMemberships.length === 0) {
        console.log('✅ No hay membresías vencidas')
        return
      }

      console.log(`📋 Encontradas ${expiredMemberships.length} membresías vencidas`)

      // Actualizar cada membresía y su usuario
      for (const membership of expiredMemberships) {
        // Cambiar estado de membresía a expirada
        membership.status = 'expired'
        await membership.save()

        // Actualizar usuario
        const user = await User.findById(membership.user)
        if (user) {
          // Si esta era su membresía actual, removerla
          if (user.currentMembership?.toString() === membership._id.toString()) {
            user.currentMembership = undefined
            user.hasActiveMembership = false
            await user.save()
            console.log(`   ✅ Membresía expirada para usuario: ${user.username}`)
          }
        }
      }

      console.log(`✅ Proceso completado: ${expiredMemberships.length} membresías expiradas`)
    } catch (error) {
      console.error('❌ Error en job de expiración de membresías:', error)
    }
  })

  console.log('✅ Job de expiración de membresías iniciado (cada hora)')
}

/**
 * Función para ejecutar manualmente el job (útil para testing)
 */
export const runMembershipExpirationJob = async () => {
  try {
    console.log('🔄 Ejecutando job de expiración de membresías (manual)...')
    
    const now = new Date()
    
    const expiredMemberships = await Membership.find({
      status: 'active',
      endDate: { $lt: now }
    }).populate('user')

    if (expiredMemberships.length === 0) {
      console.log('✅ No hay membresías vencidas')
      return { expired: 0, memberships: [] }
    }

    const results = []

    for (const membership of expiredMemberships) {
      membership.status = 'expired'
      await membership.save()

      const user = await User.findById(membership.user)
      if (user) {
        if (user.currentMembership?.toString() === membership._id.toString()) {
          user.currentMembership = undefined
          user.hasActiveMembership = false
          await user.save()
        }
        results.push({
          membershipId: membership._id,
          userId: user._id,
          username: user.username
        })
      }
    }

    console.log(`✅ Proceso completado: ${expiredMemberships.length} membresías expiradas`)
    return { expired: expiredMemberships.length, memberships: results }
  } catch (error) {
    console.error('❌ Error en job de expiración de membresías:', error)
    throw error
  }
}

