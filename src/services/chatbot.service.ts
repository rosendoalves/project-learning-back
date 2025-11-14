// IMPORTANTE: Cargar variables de entorno PRIMERO
import '../config/env'

import OpenAI from 'openai'
import { checkContentCache, saveContentCache, generateCacheKey } from './cache.service'
import { recordAPICall, recordCacheHit } from './cache-stats.service'
import crypto from 'crypto'

// Usar modelo económico para el chatbot
const CHATBOT_MODEL = process.env.OPENAI_CHATBOT_MODEL || 'gpt-3.5-turbo'
const CHATBOT_MAX_TOKENS = parseInt(process.env.OPENAI_CHATBOT_MAX_TOKENS || '500') // Respuestas cortas
const CHATBOT_TEMPERATURE = parseFloat(process.env.OPENAI_CHATBOT_TEMPERATURE || '0.7')

const openaiApiKey = process.env.OPENAI_API_KEY || ''
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null

/**
 * Genera una clave de cache para el chatbot basada en el mensaje y contexto
 */
function generateChatbotCacheKey(
  message: string,
  courseContext?: { name: string; description?: string; code?: string }
): string {
  const normalizedMessage = message.trim().toLowerCase().substring(0, 200)
  const courseName = courseContext?.name?.toLowerCase() || ''
  const params = {
    message: normalizedMessage,
    course: courseName
  }
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(params))
    .digest('hex')
  return `chatbot_${hash.substring(0, 16)}`
}

/**
 * Chatea con la IA usando un modelo económico
 */
export const chatWithAI = async (
  userMessage: string,
  userId: string,
  courseContext?: { name: string; description?: string; code?: string }
): Promise<{
  message: string
  fromCache: boolean
}> => {
  if (!openai) {
    throw new Error('OpenAI no está configurado')
  }

  try {
    // Generar clave de cache
    const cacheKey = generateChatbotCacheKey(userMessage, courseContext)

    // Verificar cache primero
    const cached = await checkContentCache(cacheKey)
    if (cached) {
      return {
        message: cached.content.body || cached.content.title || 'Respuesta en cache',
        fromCache: true
      }
    }

    // Construir contexto del curso si está disponible
    let courseContextPrompt = ''
    if (courseContext) {
      const courseNameLower = courseContext.name.toLowerCase()
      if (courseNameLower.includes('matemática') || courseNameLower.includes('matematica')) {
        courseContextPrompt = `
CONTEXTO DEL CURSO ACTUAL:
- Estás ayudando a un estudiante de Matemática (Remediación Curricular)
- Solo puedes responder preguntas relacionadas con Matemática
- NO puedes responder sobre otras materias (Historia, Lengua, Ciencias, etc.)
- Si el estudiante pregunta sobre otros temas, redirígelo educadamente a enfocarse en Matemática
- Contenidos permitidos: Números, Álgebra, Geometría, Funciones, Estadística y Probabilidad
`
      } else if (courseNameLower.includes('lengua') || courseNameLower.includes('lenguaje') || courseNameLower.includes('comunicación')) {
        courseContextPrompt = `
CONTEXTO DEL CURSO ACTUAL:
- Estás ayudando a un estudiante de Lengua y Literatura (Remediación Curricular)
- Solo puedes responder preguntas relacionadas con Lengua
- NO puedes responder sobre otras materias (Matemática, Historia, Ciencias, etc.)
- Si el estudiante pregunta sobre otros temas, redirígelo educadamente a enfocarse en Lengua
- Contenidos permitidos: Lectura, Escritura, Oralidad, Literatura, Gramática y normativa
`
      } else {
        courseContextPrompt = `
CONTEXTO DEL CURSO ACTUAL:
- Estás ayudando a un estudiante de ${courseContext.name}
- Solo puedes responder preguntas relacionadas con ${courseContext.name}
- NO puedes responder sobre otras materias
- Si el estudiante pregunta sobre otros temas, redirígelo educadamente a enfocarse en ${courseContext.name}
`
      }
    }

    const systemPrompt = `Eres un tutor virtual amigable y paciente para estudiantes secundarios argentinos. 
${courseContextPrompt}
- Responde de manera clara, concisa y educativa
- Usa un lenguaje apropiado para estudiantes secundarios
- Si no sabes algo, admítelo y sugiere revisar el material del curso
- Mantén las respuestas breves (máximo 3-4 párrafos)
- Sé alentador y constructivo`

    // Llamar a OpenAI con modelo económico
    const completion = await openai.chat.completions.create({
      model: CHATBOT_MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: CHATBOT_TEMPERATURE,
      max_tokens: CHATBOT_MAX_TOKENS
    })

    // Registrar llamada a API
    const tokensUsed = completion.usage?.total_tokens || 0
    recordAPICall('chatbot', CHATBOT_MODEL, tokensUsed)

    const response = completion.choices[0]?.message?.content || 'Lo siento, no pude generar una respuesta.'

    // Guardar en cache (usar un curso genérico si no hay contexto)
    const courseIdForCache = courseContext ? 'chatbot' : 'chatbot-general'
    await saveContentCache(
      cacheKey,
      'explanation', // Usar tipo explanation para el cache
      courseIdForCache,
      undefined,
      {
        title: 'Respuesta del Chatbot',
        body: response,
        learningObjectives: [],
        difficulty: 'intermediate'
      },
      {
        studentLevel: 'secondary',
        context: 'chatbot',
        tokensUsed,
        modelUsed: CHATBOT_MODEL
      },
      7 // 7 días TTL para respuestas del chatbot
    ).catch(err => {
      console.error('Error saving chatbot cache (non-blocking):', err)
    })

    return {
      message: response,
      fromCache: false
    }
  } catch (error: any) {
    console.error('Error en chatbot:', error)
    // Retornar respuesta de fallback en lugar de lanzar error
    return {
      message: 'Lo siento, estoy teniendo dificultades técnicas en este momento. Por favor, intenta reformular tu pregunta o consulta el material del curso.',
      fromCache: false
    }
  }
}

