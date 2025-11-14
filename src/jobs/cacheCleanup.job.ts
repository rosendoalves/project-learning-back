import cron from 'node-cron'
import { cleanExpiredCache } from '../services/cache.service'

/**
 * Job que limpia cache expirado diariamente
 * Ejecuta: todos los días a las 2:00 AM
 */
export const startCacheCleanupJob = () => {
  const cronSchedule = process.env.CACHE_CLEANUP_CRON || '0 2 * * *' // 2 AM diario

  cron.schedule(cronSchedule, async () => {
    try {
      console.log('🧹 Ejecutando limpieza de cache expirado...')
      const deleted = await cleanExpiredCache()
      console.log(`✅ Cache limpiado: ${deleted} entradas eliminadas`)
    } catch (error) {
      console.error('❌ Error en limpieza de cache:', error)
    }
  })

  console.log('✅ Job de limpieza de cache iniciado')
}

/**
 * Función para ejecutar manualmente la limpieza
 */
export const runCacheCleanup = async () => {
  try {
    const deleted = await cleanExpiredCache()
    return { deleted, message: 'Limpieza completada' }
  } catch (error: any) {
    throw new Error(`Error al limpiar cache: ${error.message}`)
  }
}

