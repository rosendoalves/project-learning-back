// Este archivo debe ser importado PRIMERO para cargar las variables de entorno
import dotenv from 'dotenv'
import path from 'path'

// Cargar .env desde la raíz del proyecto
const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath })

// Verificar variables críticas
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY no encontrada en variables de entorno')
}

export {}

