// IMPORTANTE: Cargar variables de entorno PRIMERO
import '../config/env'

import OpenAI from 'openai'
import { 
  checkContentCache, 
  saveContentCache, 
  generateCacheKey,
  generateGradingCacheKey,
  checkGradingCache,
  saveGradingCache
} from './cache.service'
import { recordAPICall } from './cache-stats.service'
import Course from '../models/Course.model'

// Configuración de modelos según propuesta
const AI_CONFIG = {
  // Modelo económico para tareas simples
  simpleModel: process.env.OPENAI_SIMPLE_MODEL || 'gpt-3.5-turbo',
  // Modelo avanzado para contenido complejo
  advancedModel: process.env.OPENAI_ADVANCED_MODEL || 'gpt-4o-mini',
  // Modelo para corrección de exámenes
  gradingModel: process.env.OPENAI_GRADING_MODEL || 'gpt-4o-mini',
  // Temperatura (creatividad)
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  // Max tokens de respuesta
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000')
}

// Inicializar cliente OpenAI
// Nota: dotenv.config() debe ejecutarse antes de importar este módulo
const openaiApiKey = process.env.OPENAI_API_KEY || ''

if (!openaiApiKey) {
  console.warn('⚠️  OpenAI: API Key no configurada en process.env.OPENAI_API_KEY')
  console.warn('   Verifica que:')
  console.warn('   1. El archivo .env existe en la raíz del proyecto')
  console.warn('   2. Contiene la línea: OPENAI_API_KEY=sk-proj-...')
  console.warn('   3. dotenv.config() se ejecuta antes de importar este módulo')
  console.warn('   Las funciones de IA no estarán disponibles.')
}

const openai = new OpenAI({
  apiKey: openaiApiKey
})

// Verificar conexión con OpenAI al iniciar (opcional, no bloqueante)
if (openaiApiKey) {
  console.log('🔄 OpenAI: Verificando conexión...')
  console.log(`   API Key encontrada (${openaiApiKey.length} caracteres)`)
  // Verificar de forma asíncrona sin bloquear el inicio
  openai.models.list()
    .then(() => {
      console.log('✅ OpenAI: Cliente inicializado correctamente')
      console.log(`   Modelo simple: ${AI_CONFIG.simpleModel}`)
      console.log(`   Modelo avanzado: ${AI_CONFIG.advancedModel}`)
      console.log(`   Modelo corrección: ${AI_CONFIG.gradingModel}`)
    })
    .catch((error) => {
      console.error('❌ OpenAI: Error al verificar conexión inicial:', error.message)
      if (error.message.includes('Invalid API key')) {
        console.error('   La API key parece ser inválida. Verifica que sea correcta.')
      } else if (error.message.includes('401')) {
        console.error('   Error de autenticación. Verifica tu API key.')
      } else {
        console.error('   El servicio seguirá funcionando, pero verifica tu API key')
      }
    })
} else {
  console.warn('⚠️  OpenAI: API Key no configurada. Las funciones de IA no estarán disponibles.')
}

/**
 * Genera contenido educativo usando IA con cache
 */
export const generateEducationalContent = async (
  contentType: 'syllabus' | 'topic' | 'exercise' | 'explanation',
  courseId: string,
  topicId: string | undefined,
  studentLevel: string,
  context: string,
  additionalParams?: Record<string, any>
): Promise<any> => {
  try {
    // Obtener información del curso para contexto
    const course = await Course.findById(courseId)
    if (!course) {
      throw new Error('Curso no encontrado')
    }

    // Generar clave de cache
    const cacheKey = generateCacheKey(
      contentType,
      courseId,
      studentLevel,
      context,
      additionalParams
    )

    // Verificar cache primero
    const cached = await checkContentCache(cacheKey)
    if (cached) {
      // recordCacheHit ya se llama dentro de checkContentCache
      return {
        content: cached.content,
        fromCache: true,
        cacheKey: cached.cacheKey
      }
    }

    console.log(`🔄 Generando nuevo contenido ${contentType} con IA...`)

    // Determinar qué modelo usar según complejidad
    const useAdvancedModel = contentType === 'syllabus' || contentType === 'explanation'
    const model = useAdvancedModel ? AI_CONFIG.advancedModel : AI_CONFIG.simpleModel

    // Construir prompt según tipo de contenido con contexto del curso
    const prompt = buildPrompt(contentType, studentLevel, context, course, additionalParams)

    // Llamar a OpenAI con contexto del curso
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(contentType, course)
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.maxTokens
    })

    // Registrar llamada a API
    recordAPICall(contentType, model, completion.usage?.total_tokens)

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No se recibió respuesta de la IA')
    }

    // Parsear respuesta JSON
    let parsedContent
    try {
      parsedContent = JSON.parse(response)
    } catch {
      // Si no es JSON válido, crear estructura básica
      parsedContent = {
        title: `Contenido de ${contentType}`,
        body: response,
        learningObjectives: [],
        difficulty: 'intermediate'
      }
    }

    // Guardar en cache
    await saveContentCache(
      cacheKey,
      contentType,
      courseId,
      topicId,
      parsedContent,
      {
        studentLevel,
        context,
        tokensUsed: completion.usage?.total_tokens,
        modelUsed: model
      },
      contentType === 'syllabus' ? 30 : 30 // TTL en días
    )

    return {
      content: parsedContent,
      fromCache: false,
      cacheKey,
      tokensUsed: completion.usage?.total_tokens,
      modelUsed: model
    }
  } catch (error: any) {
    console.error('Error generating educational content:', error)
    throw new Error(`Error al generar contenido: ${error.message}`)
  }
}

/**
 * Genera recomendaciones personalizadas para un estudiante
 */
export const generateRecommendations = async (
  studentId: string,
  courseId: string,
  studentProfile: {
    progress: number
    strengths: string[]
    weaknesses: string[]
    learningStyle?: string
  }
): Promise<any> => {
  try {
    const {
      generateRecommendationCacheKey,
      checkRecommendationCache,
      saveRecommendationCache
    } = await import('./cache.service')
    
    const cacheKey = generateRecommendationCacheKey(studentId, courseId, studentProfile)
    
    // Verificar cache primero
    const cached = await checkRecommendationCache(cacheKey)
    if (cached) {
      // recordCacheHit ya se llama dentro de checkRecommendationCache
      return {
        recommendations: cached.recommendations,
        fromCache: true,
        cacheKey: cached.cacheKey
      }
    }

    // Generar recomendaciones
    const prompt = `
Analiza el perfil del estudiante y genera recomendaciones personalizadas:

Perfil del Estudiante:
- Progreso en el curso: ${studentProfile.progress}%
- Fortalezas: ${studentProfile.strengths.join(', ')}
- Debilidades: ${studentProfile.weaknesses.join(', ')}
- Estilo de aprendizaje: ${studentProfile.learningStyle || 'No especificado'}

Genera recomendaciones específicas en formato JSON:
{
  "nextTopics": [
    {
      "topicId": "string",
      "priority": number (1-10),
      "reason": "string"
    }
  ],
  "suggestedExercises": [
    {
      "exerciseId": "string",
      "type": "string",
      "difficulty": "string"
    }
  ],
  "studyPlan": [
    {
      "topic": "string",
      "estimatedTime": number (minutos),
      "order": number
    }
  ],
  "areasToFocus": ["string"]
}
`

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.advancedModel,
      messages: [
        {
          role: 'system',
          content: 'Eres un tutor educativo experto en Argentina. Genera recomendaciones personalizadas y específicas para mejorar el aprendizaje del estudiante.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })

    // Registrar llamada a API
    recordAPICall('recommendation', AI_CONFIG.advancedModel, completion.usage?.total_tokens)

    const response = completion.choices[0]?.message?.content
    let recommendations
    try {
      recommendations = JSON.parse(response || '{}')
    } catch {
      recommendations = {
        nextTopics: [],
        suggestedExercises: [],
        studyPlan: [],
        areasToFocus: []
      }
    }

    // Guardar en cache
    await saveRecommendationCache(
      cacheKey,
      studentId,
      courseId,
      recommendations,
      studentProfile,
      completion.usage?.total_tokens,
      AI_CONFIG.advancedModel,
      7 // 7 días TTL
    )

    return {
      recommendations,
      fromCache: false,
      tokensUsed: completion.usage?.total_tokens
    }
  } catch (error: any) {
    console.error('Error generating recommendations:', error)
    throw new Error(`Error al generar recomendaciones: ${error.message}`)
  }
}

/**
 * Genera un fallback básico cuando falla la corrección por IA
 */
function generateFallbackGrading(
  question: string,
  studentAnswer: string,
  courseContext?: { name: string; description: string }
): {
  score: number
  feedback: string
  suggestions: string[]
} {
  const answerLength = studentAnswer.trim().length
  const hasContent = answerLength > 20
  
  // Calcular score básico basado en longitud y contenido
  let score = 50 // Score base
  if (hasContent) {
    score += Math.min(30, Math.floor(answerLength / 10)) // Bonus por longitud
  }
  if (answerLength < 20) {
    score = Math.max(20, score - 20) // Penalizar respuestas muy cortas
  }
  
  const courseName = courseContext?.name || 'la materia'
  
  const feedback = hasContent
    ? `Tu respuesta ha sido revisada. Has proporcionado ${answerLength} caracteres de contenido. 
    
Para mejorar tu respuesta, asegúrate de:
- Explicar los conceptos de manera clara y completa
- Incluir ejemplos cuando sea relevante
- Relacionar tu respuesta con los temas estudiados en ${courseName}
- Revisar la ortografía y la estructura de tu texto

Continúa practicando para mejorar tu comprensión de los temas.`
    : `Tu respuesta es muy breve. Para obtener una mejor calificación, intenta:
- Desarrollar más tus ideas
- Explicar los conceptos con mayor detalle
- Relacionar tu respuesta con los contenidos de ${courseName}
- Incluir ejemplos o casos prácticos cuando sea apropiado

Recuerda que una respuesta completa demuestra mejor comprensión del tema.`

  const suggestions = [
    'Revisa los conceptos clave relacionados con la pregunta',
    'Intenta explicar tu razonamiento paso a paso',
    'Incluye ejemplos concretos cuando sea posible'
  ]

  return {
    score: Math.min(100, Math.max(0, score)),
    feedback,
    suggestions
  }
}

/**
 * Corrige un examen de desarrollo usando IA con cache y fallback
 */
export const gradeDevelopmentExam = async (
  question: string,
  studentAnswer: string,
  rubric?: string,
  courseContext?: { name: string; description: string },
  courseId?: string
): Promise<{
  score: number
  feedback: string
  suggestions: string[]
}> => {
  // Generar clave de cache
  const cacheKey = generateGradingCacheKey(
    question,
    studentAnswer,
    rubric,
    courseContext?.name
  )

      // Verificar cache primero
      try {
        const cached = await checkGradingCache(cacheKey)
        if (cached) {
          // recordCacheHit ya se llama dentro de checkGradingCache
          return cached
        }
      } catch (error) {
        console.error('Error checking grading cache:', error)
        // Continuar con la generación si falla el cache
      }

  try {
    // Obtener contexto curricular si está disponible
    let curricularRestriction = ''
    if (courseContext) {
      const courseNameLower = courseContext.name.toLowerCase()
      if (courseNameLower.includes('matemática') || courseNameLower.includes('matematica')) {
        curricularRestriction = `
RESTRICCIÓN DE CONTEXTO - MATEMÁTICA:
- Materia: Matemática
- Solo evalúa conocimientos de Matemática (Números, Álgebra, Geometría, Funciones, Estadística)
- Si la respuesta menciona temas de otras materias (Historia, Lengua, Ciencias, etc.), NO los consideres en la evaluación
- Enfócate únicamente en la corrección de conceptos matemáticos
- Si el estudiante se desvía a otros temas, indícalo en el feedback pero no lo evalúes
`
      } else if (courseNameLower.includes('lengua') || courseNameLower.includes('lenguaje') || courseNameLower.includes('comunicación')) {
        curricularRestriction = `
RESTRICCIÓN DE CONTEXTO - LENGUA Y LITERATURA:
- Materia: Lengua y Literatura
- Solo evalúa conocimientos de Lengua (Lectura, Escritura, Literatura, Gramática, Oralidad)
- Si la respuesta menciona temas de otras materias (Matemática, Historia, Ciencias, etc.), NO los consideres en la evaluación
- Enfócate únicamente en la corrección de conceptos de Lengua
- Si el estudiante se desvía a otros temas, indícalo en el feedback pero no lo evalúes
`
      } else {
        curricularRestriction = `
RESTRICCIÓN DE CONTEXTO:
- Materia: ${courseContext.name}
- Solo evalúa conocimientos relacionados con ${courseContext.name}
- Si la respuesta menciona temas de otras materias, NO los consideres en la evaluación
- Enfócate únicamente en la corrección de conceptos de ${courseContext.name}
- Si el estudiante se desvía a otros temas, indícalo en el feedback pero no lo evalúes
`
      }
    }
    
    const prompt = `
Corrige el siguiente examen de desarrollo:

${curricularRestriction}

Pregunta del examen: ${question}

Respuesta del estudiante: ${studentAnswer}

${rubric ? `Rúbrica de evaluación: ${rubric}` : 'Evalúa la respuesta considerando: comprensión del tema, claridad en la explicación, uso correcto de conceptos, y completitud de la respuesta.'}

INSTRUCCIONES CRÍTICAS PARA EL FEEDBACK:
1. SIEMPRE debes responder la pregunta del examen en tu feedback, mostrando la solución correcta paso a paso
2. Luego evalúa la respuesta del estudiante comparándola con la solución correcta
3. El feedback debe tener DOS partes claramente separadas:
   a) SOLUCIÓN CORRECTA: Responde completamente la pregunta del examen con explicación detallada y paso a paso
   b) EVALUACIÓN DE TU RESPUESTA: Compara la respuesta del estudiante con la solución correcta y proporciona retroalimentación específica

4. Si el estudiante no respondió o respondió incorrectamente, igualmente muestra la solución correcta completa
5. Solo evalúa el contenido relacionado con la materia del examen
6. Ignora o descuenta puntos si el estudiante se desvía a temas de otras materias
7. El feedback debe ser educativo y ayudar al estudiante a aprender

EJEMPLO DE ESTRUCTURA DEL FEEDBACK:
"SOLUCIÓN CORRECTA:
[Responde completamente la pregunta del examen aquí, paso a paso, mostrando todos los cálculos y explicaciones necesarias]

EVALUACIÓN DE TU RESPUESTA:
[Compara la respuesta del estudiante con la solución correcta y proporciona retroalimentación específica sobre qué está bien, qué está mal, y cómo mejorar]"

Proporciona:
1. Puntaje (0-100) - basado SOLO en la materia evaluada y en qué tan correcta es la respuesta del estudiante
2. Retroalimentación detallada que INCLUYA la solución correcta completa de la pregunta (esto es OBLIGATORIO)
3. Sugerencias de mejora (máximo 3, relacionadas con la materia)

Formato JSON:
{
  "score": number (0-100),
  "feedback": "string (DEBE incluir la solución correcta completa de la pregunta seguida de la evaluación de la respuesta del estudiante)",
  "suggestions": ["string"]
}
`

    const systemPrompt = courseContext 
      ? `Eres un profesor experto en educación secundaria argentina especializado en ${courseContext.name}. Corriges exámenes de manera justa y constructiva, alineado con los estándares curriculares oficiales. SOLO evalúas contenido relacionado con ${courseContext.name}. Si el estudiante menciona temas de otras materias, no los consideres en la evaluación. Mantén el foco estrictamente en ${courseContext.name}.`
      : 'Eres un profesor experto en educación secundaria argentina. Corriges exámenes de desarrollo proporcionando retroalimentación constructiva y formativa.'

    console.log('🔄 Generando corrección con IA...')

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.gradingModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Baja temperatura para corrección consistente
      max_tokens: 1000
    })

    // Registrar llamada a API
    const tokensUsed = completion.usage?.total_tokens || 0
    recordAPICall('grading', AI_CONFIG.gradingModel, tokensUsed)

    const response = completion.choices[0]?.message?.content
    let result
    try {
      result = JSON.parse(response || '{}')
    } catch {
      // Si no se puede parsear, usar fallback
      console.warn('⚠️ No se pudo parsear respuesta de IA, usando fallback')
      result = generateFallbackGrading(question, studentAnswer, courseContext)
    }

    const gradingResult = {
      score: result.score || 0,
      feedback: result.feedback || generateFallbackGrading(question, studentAnswer, courseContext).feedback,
      suggestions: result.suggestions || []
    }

    // Guardar en cache con tokens (no bloqueante)
    saveGradingCache(cacheKey, gradingResult, courseId, tokensUsed).catch(err => {
      console.error('Error saving grading cache (non-blocking):', err)
    })

    return gradingResult
  } catch (error: any) {
    console.error('❌ Error grading exam:', error)
    
    // Siempre retornar un fallback útil en lugar de lanzar error
    const fallback = generateFallbackGrading(question, studentAnswer, courseContext)
    
    // Intentar guardar el fallback en cache para evitar futuras peticiones (sin tokens ya que no hubo llamada a API)
    saveGradingCache(cacheKey, fallback, courseId, 0).catch(err => {
      console.error('Error saving fallback cache (non-blocking):', err)
    })
    
    return fallback
  }
}

/**
 * Obtiene el contexto curricular según la materia
 */
function getCurricularContext(courseName: string, courseDescription: string): string {
  const courseNameLower = courseName.toLowerCase()
  
  if (courseNameLower.includes('matemática') || courseNameLower.includes('matematica')) {
    return `
CONTEXTO CURRICULAR - MATEMÁTICA:
- Materia: Matemática (Remediación Curricular)
- Alineado con: NAP de Matemática para Ciclo Básico y Orientado
- Enfoque: Recuperación de contenidos previos, aprobación de materias adeudadas
- Contenidos permitidos: Números y operaciones, Álgebra, Geometría, Funciones, Estadística y Probabilidad
- Contenidos PROHIBIDOS: Cualquier tema fuera del currículo oficial de Matemática argentina
- Nivel: Secundario argentino (1° a 5°/6° año según corresponda)
`
  } else if (courseNameLower.includes('lengua') || courseNameLower.includes('lenguaje') || courseNameLower.includes('comunicación')) {
    return `
CONTEXTO CURRICULAR - LENGUA Y LITERATURA:
- Materia: Lengua y Literatura (Remediación Curricular)
- Alineado con: NAP de Lengua para Ciclo Básico y Orientado
- Enfoque: Recuperación de contenidos previos, aprobación de materias adeudadas
- Contenidos permitidos: Lectura y comprensión, Escritura, Oralidad, Literatura, Gramática y normativa
- Contenidos PROHIBIDOS: Cualquier tema fuera del currículo oficial de Lengua argentina
- Nivel: Secundario argentino (1° a 5°/6° año según corresponda)
`
  }
  
  // Contexto genérico si no se identifica la materia
  return `
CONTEXTO CURRICULAR:
- Materia: ${courseName}
- Descripción: ${courseDescription}
- Alineado con: NAP y Diseños Curriculares oficiales de Argentina
- Nivel: Secundario argentino
`
}

/**
 * Construye el prompt según el tipo de contenido
 */
function buildPrompt(
  contentType: string,
  studentLevel: string,
  context: string,
  course: any,
  additionalParams?: Record<string, any>
): string {
  const curricularContext = getCurricularContext(course.name, course.description)
  
  const basePrompt = `
Eres un profesor experto en educación secundaria argentina. 
Genera contenido educativo alineado con los Núcleos de Aprendizaje Prioritarios (NAP) y los Diseños Curriculares oficiales.

${curricularContext}

RESTRICCIONES ESTRICTAS:
- SOLO puedes hablar sobre temas relacionados con ${course.name}
- NO puedes mencionar, explicar o referenciar temas de otras materias
- Si el estudiante pregunta sobre algo fuera de ${course.name}, debes redirigir su atención al contenido de la materia
- Todo el contenido debe estar dentro del currículo oficial de ${course.name} para secundaria argentina
- Usa terminología y enfoques pedagógicos oficiales de Argentina

Contexto específico de la solicitud:
- Nivel del estudiante: ${studentLevel}
- Contexto: ${context}
${additionalParams ? `- Parámetros adicionales: ${JSON.stringify(additionalParams)}` : ''}

IMPORTANTE: 
- El contenido debe estar alineado ÚNICAMENTE con ${course.name}
- Si se solicita contenido fuera de esta materia, responde: "Este contenido está fuera del alcance de ${course.name}. Por favor, enfócate en los temas de esta materia."
`

  switch (contentType) {
    case 'syllabus':
      return `${basePrompt}

Genera un temario completo en formato JSON:
{
  "title": "Título del temario",
  "body": "Descripción completa",
  "learningObjectives": ["objetivo1", "objetivo2", "objetivo3"],
  "difficulty": "beginner|intermediate|advanced",
  "topics": [
    {
      "title": "Título del tema",
      "description": "Descripción",
      "order": number,
      "estimatedTime": number (horas)
    }
  ]
}`

    case 'topic':
      return `${basePrompt}

Genera contenido detallado para un tema específico en formato JSON:
{
  "title": "Título del tema",
  "body": "Explicación completa y didáctica (máx 1000 palabras)",
  "learningObjectives": ["objetivo1", "objetivo2", "objetivo3"],
  "difficulty": "beginner|intermediate|advanced",
  "examples": ["ejemplo1", "ejemplo2"],
  "connections": ["conexión con otros temas"]
}`

    case 'exercise':
      return `${basePrompt}

Genera ejercicios prácticos en formato JSON:
{
  "title": "Título del ejercicio",
  "body": "Enunciado del ejercicio",
  "learningObjectives": ["objetivo1"],
  "difficulty": "beginner|intermediate|advanced",
  "solution": "Solución paso a paso",
  "hints": ["pista1", "pista2"]
}`

    case 'explanation':
      return `${basePrompt}

Genera una explicación detallada en formato JSON:
{
  "title": "Título de la explicación",
  "body": "Explicación clara y didáctica (máx 800 palabras)",
  "learningObjectives": ["objetivo1", "objetivo2"],
  "difficulty": "beginner|intermediate|advanced",
  "examples": ["ejemplo práctico"],
  "visualAids": ["sugerencia de ayuda visual"]
}`

    default:
      return basePrompt
  }
}

/**
 * Obtiene el prompt del sistema según el tipo de contenido
 */
function getSystemPrompt(contentType: string, course: any): string {
  const courseName = course.name
  const courseNameLower = courseName.toLowerCase()
  
  // Determinar la materia específica
  let subjectContext = ''
  if (courseNameLower.includes('matemática') || courseNameLower.includes('matematica')) {
    subjectContext = 'Matemática. Solo puedes hablar sobre: Números, Álgebra, Geometría, Funciones, Estadística y Probabilidad. NO puedes hablar de otras materias.'
  } else if (courseNameLower.includes('lengua') || courseNameLower.includes('lenguaje') || courseNameLower.includes('comunicación')) {
    subjectContext = 'Lengua y Literatura. Solo puedes hablar sobre: Lectura, Escritura, Oralidad, Literatura, Gramática. NO puedes hablar de otras materias.'
  } else {
    subjectContext = `${courseName}. Solo puedes hablar sobre temas relacionados con ${courseName}. NO puedes hablar de otras materias.`
  }
  
  const baseSystem = `Eres un profesor experto en educación secundaria argentina especializado en ${courseName}. 
Tu conocimiento está alineado con los NAP (Núcleos de Aprendizaje Prioritarios) y los Diseños Curriculares oficiales de Argentina.

RESTRICCIÓN CRÍTICA: 
- SOLO puedes generar contenido relacionado con ${subjectContext}
- Si se solicita contenido fuera de ${courseName}, debes rechazarlo educadamente y redirigir al estudiante
- NUNCA generes contenido sobre otras materias (Historia, Ciencias, Física, Química, etc.) a menos que sea específicamente relevante para ${courseName}
- Mantén el foco estrictamente en ${courseName} y su currículo oficial.`

  switch (contentType) {
    case 'syllabus':
      return `${baseSystem} Especialízate en crear temarios estructurados y completos que sigan la secuencia pedagógica oficial de ${courseName}.`
    case 'topic':
      return `${baseSystem} Especialízate en explicar conceptos de ${courseName} de manera clara y didáctica, adaptándote al nivel del estudiante.`
    case 'exercise':
      return `${baseSystem} Especialízate en crear ejercicios prácticos y relevantes de ${courseName} que refuercen el aprendizaje.`
    case 'explanation':
      return `${baseSystem} Especialízate en proporcionar explicaciones detalladas y comprensibles sobre ${courseName}.`
    default:
      return baseSystem
  }
}

/**
 * Obtiene estadísticas de uso de IA
 */
export const getAIStats = async () => {
  try {
    const { getCacheStats } = await import('./cache.service')
    const cacheStats = await getCacheStats()
    
    // Aquí podrías agregar más estadísticas de uso de tokens, costos, etc.
    return {
      cache: cacheStats,
      models: {
        simple: AI_CONFIG.simpleModel,
        advanced: AI_CONFIG.advancedModel,
        grading: AI_CONFIG.gradingModel
      }
    }
  } catch (error) {
    console.error('Error getting AI stats:', error)
    return null
  }
}

