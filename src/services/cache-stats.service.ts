/**
 * Servicio para tracking de estadísticas de cache
 * Registra cuando se usa cache vs cuando se llama a OpenAI
 */

interface CacheStats {
  cacheHits: number
  apiCalls: number
  lastReset: Date
}

// Estadísticas globales (en producción usar Redis o DB)
let globalStats: CacheStats = {
  cacheHits: 0,
  apiCalls: 0,
  lastReset: new Date()
}

/**
 * Registra un cache hit
 */
export const recordCacheHit = (contentType: string, cacheKey: string) => {
  globalStats.cacheHits++
  const timestamp = new Date().toISOString()
  console.log(`✅ [CACHE HIT] ${timestamp} | Tipo: ${contentType} | Key: ${cacheKey.substring(0, 16)}...`)
}

/**
 * Registra una llamada a la API de OpenAI
 */
export const recordAPICall = (contentType: string, model: string, tokens?: number) => {
  globalStats.apiCalls++
  const timestamp = new Date().toISOString()
  const tokensInfo = tokens ? ` | Tokens: ${tokens}` : ''
  console.log(`🔄 [API CALL] ${timestamp} | Tipo: ${contentType} | Modelo: ${model}${tokensInfo}`)
}

/**
 * Obtiene las estadísticas actuales
 */
export const getCacheStats = (): CacheStats => {
  return { ...globalStats }
}

/**
 * Resetea las estadísticas
 */
export const resetCacheStats = () => {
  globalStats = {
    cacheHits: 0,
    apiCalls: 0,
    lastReset: new Date()
  }
  console.log('📊 [STATS RESET] Estadísticas de cache reseteadas')
}

/**
 * Obtiene el ratio de cache hits
 */
export const getCacheHitRate = (): number => {
  const total = globalStats.cacheHits + globalStats.apiCalls
  if (total === 0) return 0
  return (globalStats.cacheHits / total) * 100
}

