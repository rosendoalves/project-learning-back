import mongoose from 'mongoose'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import User from '../models/User.model'
import Course from '../models/Course.model'
import Topic from '../models/Topic.model'
import Exam from '../models/Exam.model'
import Question from '../models/Question.model'
import Membership from '../models/Membership.model'
import Payment from '../models/Payment.model'
import Feature from '../models/Feature.model'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || ''

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Limpiar datos existentes
    await User.deleteMany({})
    await Course.deleteMany({})
    await Topic.deleteMany({})
    await Exam.deleteMany({})
    await Question.deleteMany({})
    await Membership.deleteMany({})
    await Payment.deleteMany({})
    await Feature.deleteMany({})

    console.log('🗑️  Cleared existing data')

    // Crear features
    await Feature.create({
      name: 'chatbot',
      enabled: true,
      description: 'Chatbot de asistencia educativa con IA',
      config: {
        model: 'gpt-3.5-turbo',
        maxTokens: 500,
        temperature: 0.7
      }
    })

    console.log('⚙️  Created features')

    // Crear usuarios estudiantes de prueba
    // Contexto: Estudiantes con materias previas que necesitan remediación
    const hashedPassword = await bcrypt.hash('123456', 10)
    const students = []
    const membershipTypes = ['weekly', 'monthly', 'quarterly', 'semiannual', 'annual']
    const USD_TO_ARS = 1000 // Tasa de conversión
    const membershipPrices = [
      7 * USD_TO_ARS,        // Semanal: $7 USD
      19.99 * USD_TO_ARS,    // Mensual: $19.99 USD
      49.99 * USD_TO_ARS,    // Trimestral: $49.99 USD
      89.99 * USD_TO_ARS,    // Semestral: $89.99 USD
      143.88 * USD_TO_ARS    // Anual: $143.88 USD
    ]
    const membershipDurations = [7, 30, 90, 180, 365] // días

    // Crear 5 estudiantes con diferentes membresías
    for (let i = 1; i <= 5; i++) {
      const student = await User.create({
        username: `estudiante${i}`,
        password: hashedPassword,
        email: `estudiante${i}@example.com`,
        fullName: `Estudiante de Prueba ${i}`,
        role: 'student',
        hasActiveMembership: false
      })

      const startDate = new Date()
      const endDate = new Date()
      
      // El estudiante5 tendrá membresía expirada (inactiva)
      if (i === 5) {
        // Membresía expirada hace 30 días
        startDate.setDate(startDate.getDate() - 395) // Hace ~13 meses
        endDate.setDate(endDate.getDate() - 30) // Expiró hace 30 días
        const expiredMembership = await Membership.create({
          user: student._id,
          type: 'annual',
          status: 'expired',
          startDate: startDate,
          endDate: endDate,
          price: 143.88 * USD_TO_ARS, // $143.88 USD
          currency: 'ARS',
          autoRenew: false
        })

        const expiredPayment = await Payment.create({
          user: student._id,
          membership: expiredMembership._id,
          amount: 143.88 * USD_TO_ARS,
          currency: 'ARS',
          status: 'completed',
          paymentMethod: 'other',
          transactionId: `SEED-TXN-EXPIRED-${Date.now()}-${i}`,
          paymentDate: startDate
        })

        expiredMembership.paymentId = expiredPayment._id
        await expiredMembership.save()

        // Estudiante sin membresía activa
        student.hasActiveMembership = false
        await student.save()
      } else {
        // Membresías activas para estudiantes 1-4
        const typeIndex = i - 1
        endDate.setDate(endDate.getDate() + membershipDurations[typeIndex])

        const membership = await Membership.create({
          user: student._id,
          type: membershipTypes[typeIndex] as any,
          status: 'active',
          startDate: startDate,
          endDate: endDate,
          price: membershipPrices[typeIndex],
          currency: 'ARS',
          autoRenew: false
        })

        const payment = await Payment.create({
          user: student._id,
          membership: membership._id,
          amount: membershipPrices[typeIndex],
          currency: 'ARS',
          status: 'completed',
          paymentMethod: 'other',
          transactionId: `SEED-TXN-${Date.now()}-${i}`,
          paymentDate: startDate
        })

        membership.paymentId = payment._id
        await membership.save()

        // Actualizar estudiante con membresía activa
        student.currentMembership = membership._id
        student.hasActiveMembership = true
        await student.save()
      }

      students.push(student)
    }

    // Crear usuario administrador
    const adminPassword = await bcrypt.hash('admin', 10)
    const admin = await User.create({
      username: 'admin',
      password: adminPassword,
      email: 'admin@example.com',
      fullName: 'Administrador',
      role: 'admin',
      hasActiveMembership: true // Los admins no necesitan membresía
    })

    console.log('👤 Created test users (Estudiantes con materias previas)')
    console.log('   - Estudiante1: estudiante1 / 123456 (membresía semanal $7 USD - Rescate Express)')
    console.log('   - Estudiante2: estudiante2 / 123456 (membresía mensual $19.99 USD - 1 Materia Previa)')
    console.log('   - Estudiante3: estudiante3 / 123456 (membresía trimestral $49.99 USD - 2-3 Materias)')
    console.log('   - Estudiante4: estudiante4 / 123456 (membresía semestral $89.99 USD - Apoyo Sostenido)')
    console.log('   - Estudiante5: estudiante5 / 123456 (membresía anual expirada - sin acceso)')
    console.log('   - Admin: admin / admin')
    console.log('')
    console.log('📚 Cursos de Remediación:')
    console.log('   - Matemática (Materia Crítica - NAP alineado)')
    console.log('   - Lengua y Literatura (Materia Crítica - NAP alineado)')

    // Crear curso de Matemática (Materia Crítica - Remediación)
    // Enfoque: Estudiantes con materias previas que necesitan aprobar
    const mathCourse = await Course.create({
      name: 'Matemática - Remediación Curricular',
      description: 'Curso de remediación de Matemática para estudiantes secundarios con materias previas. Contenido alineado con NAP y Diseños Curriculares oficiales. Enfoque en recuperación y aprobación de materias adeudadas.',
      teacher: 'Sistema de IA + Tutores',
      year: 'Ciclo Básico (1° a 3° Año)',
      code: 'MAT-REMED',
      students: students.map(s => s._id)
    })

    // Temas de Matemática
    const mathTopics = await Topic.insertMany([
      {
        title: 'Álgebra y Ecuaciones',
        content: 'Estudio de expresiones algebraicas, ecuaciones lineales y cuadráticas. Resolución de problemas aplicando métodos algebraicos.',
        order: 1,
        course: mathCourse._id
      },
      {
        title: 'Geometría',
        content: 'Figuras geométricas, perímetros, áreas y volúmenes. Teoremas fundamentales de la geometría plana y espacial.',
        order: 2,
        course: mathCourse._id
      },
      {
        title: 'Funciones',
        content: 'Concepto de función, representación gráfica, funciones lineales, cuadráticas y exponenciales. Análisis de comportamiento.',
        order: 3,
        course: mathCourse._id
      },
      {
        title: 'Probabilidad y Estadística',
        content: 'Análisis de datos, medidas de tendencia central, probabilidad de eventos simples y compuestos.',
        order: 4,
        course: mathCourse._id
      }
    ])

    mathCourse.topics = mathTopics.map(t => t._id)
    await mathCourse.save()

    // Examen de Matemática - Múltiple Choice
    const mathExam1 = await Exam.create({
      title: 'Examen Parcial - Álgebra y Ecuaciones',
      description: 'Evaluación sobre conceptos de álgebra y resolución de ecuaciones',
      type: 'multiple-choice',
      course: mathCourse._id,
      totalPoints: 35
    })

    const mathQuestions1 = await Question.insertMany([
      {
        question: '¿Cuál es el valor de x en la ecuación 2x + 5 = 13?',
        type: 'multiple-choice',
        options: ['x = 3', 'x = 4', 'x = 5', 'x = 6'],
        correctAnswer: 1,
        points: 10,
        exam: mathExam1._id,
        order: 1
      },
      {
        question: '¿Cuál es la solución de la ecuación cuadrática x² - 5x + 6 = 0?',
        type: 'multiple-choice',
        options: ['x = 2 y x = 3', 'x = 1 y x = 6', 'x = -2 y x = -3', 'x = 0 y x = 5'],
        correctAnswer: 0,
        points: 15,
        exam: mathExam1._id,
        order: 2
      },
      {
        question: 'Simplifica la expresión: 3x + 2y - x + 4y',
        type: 'multiple-choice',
        options: ['2x + 6y', '4x + 6y', '2x + 2y', '4x + 2y'],
        correctAnswer: 0,
        points: 10,
        exam: mathExam1._id,
        order: 3
      }
    ])

    mathExam1.questions = mathQuestions1.map(q => q._id)
    await mathExam1.save()

    // Examen de Matemática - Desarrollo
    const mathExam2 = await Exam.create({
      title: 'Examen de Desarrollo - Funciones y Gráficos',
      description: 'Resuelve los siguientes problemas desarrollando el procedimiento completo',
      type: 'development',
      course: mathCourse._id,
      totalPoints: 90
    })

    const mathQuestions2 = await Question.insertMany([
      {
        question: 'Dada la función f(x) = 2x + 3, encuentra: a) El valor de f(5), b) El punto donde la función corta el eje y, c) La pendiente de la recta. Explica cada paso de tu razonamiento.',
        type: 'development',
        points: 25,
        exam: mathExam2._id,
        order: 1
      },
      {
        question: 'Resuelve el siguiente problema: Un terreno rectangular tiene un perímetro de 60 metros. Si el largo es el doble del ancho, ¿cuáles son las dimensiones del terreno? Muestra todos los pasos de tu solución.',
        type: 'development',
        points: 30,
        exam: mathExam2._id,
        order: 2
      },
      {
        question: 'Analiza la función cuadrática f(x) = x² - 4x + 3. Determina: a) Las raíces, b) El vértice, c) El eje de simetría. Justifica cada respuesta con el procedimiento correspondiente.',
        type: 'development',
        points: 35,
        exam: mathExam2._id,
        order: 3
      }
    ])

    mathExam2.questions = mathQuestions2.map(q => q._id)
    await mathExam2.save()

    mathCourse.exams = [mathExam1._id, mathExam2._id]
    await mathCourse.save()

    // Crear curso de Lengua (Materia Crítica - Remediación)
    // Enfoque: Estudiantes con materias previas que necesitan aprobar
    const lenguaCourse = await Course.create({
      name: 'Lengua y Literatura - Remediación Curricular',
      description: 'Curso de remediación de Lengua y Literatura para estudiantes secundarios con materias previas. Contenido alineado con NAP y Diseños Curriculares oficiales. Enfoque en comprensión lectora, producción de textos y análisis literario.',
      teacher: 'Sistema de IA + Tutores',
      year: 'Ciclo Básico (1° a 3° Año)',
      code: 'LEN-REMED',
      students: students.map(s => s._id)
    })

    // Temas de Lengua
    const lenguaTopics = await Topic.insertMany([
      {
        title: 'Análisis de Textos Narrativos',
        content: 'Comprensión y análisis de cuentos, novelas y relatos. Identificación de elementos narrativos: narrador, personajes, tiempo y espacio.',
        order: 1,
        course: lenguaCourse._id
      },
      {
        title: 'Géneros Literarios',
        content: 'Estudio de los géneros literarios: lírico, narrativo y dramático. Características y ejemplos de cada género.',
        order: 2,
        course: lenguaCourse._id
      },
      {
        title: 'Gramática y Sintaxis',
        content: 'Análisis sintáctico de oraciones simples y compuestas. Uso correcto de la puntuación y acentuación.',
        order: 3,
        course: lenguaCourse._id
      },
      {
        title: 'Producción de Textos',
        content: 'Técnicas de escritura: narración, descripción y argumentación. Estructura de textos académicos.',
        order: 4,
        course: lenguaCourse._id
      }
    ])

    lenguaCourse.topics = lenguaTopics.map(t => t._id)
    await lenguaCourse.save()

    // Examen de Lengua - Múltiple Choice
    const lenguaExam1 = await Exam.create({
      title: 'Evaluación - Comprensión Lectora',
      description: 'Lee el texto y responde las siguientes preguntas',
      type: 'multiple-choice',
      course: lenguaCourse._id,
      totalPoints: 30
    })

    const lenguaQuestions1 = await Question.insertMany([
      {
        question: '¿Cuál es la función principal del narrador en un texto narrativo?',
        type: 'multiple-choice',
        options: [
          'Describir el ambiente',
          'Contar la historia desde un punto de vista',
          'Crear los personajes',
          'Establecer el tiempo'
        ],
        correctAnswer: 1,
        points: 10,
        exam: lenguaExam1._id,
        order: 1
      },
      {
        question: '¿Qué tipo de narrador usa la primera persona del singular?',
        type: 'multiple-choice',
        options: [
          'Narrador omnisciente',
          'Narrador testigo',
          'Narrador protagonista',
          'Narrador objetivo'
        ],
        correctAnswer: 2,
        points: 10,
        exam: lenguaExam1._id,
        order: 2
      },
      {
        question: '¿Cuál de los siguientes es un género lírico?',
        type: 'multiple-choice',
        options: ['Novela', 'Poesía', 'Cuento', 'Ensayo'],
        correctAnswer: 1,
        points: 10,
        exam: lenguaExam1._id,
        order: 3
      }
    ])

    lenguaExam1.questions = lenguaQuestions1.map(q => q._id)
    await lenguaExam1.save()

    // Examen de Lengua - Desarrollo
    const lenguaExam2 = await Exam.create({
      title: 'Examen de Desarrollo - Análisis Literario',
      description: 'Analiza el texto propuesto desarrollando tus ideas de forma completa',
      type: 'development',
      course: lenguaCourse._id,
      totalPoints: 100
    })

    const lenguaQuestions2 = await Question.insertMany([
      {
        question: 'Lee el siguiente fragmento y realiza un análisis completo: "El viento soplaba con fuerza, moviendo las hojas secas por el sendero. María caminaba lentamente, pensando en las palabras que había escuchado esa mañana." Identifica: a) El tipo de narrador, b) Los elementos descriptivos, c) El tiempo verbal utilizado. Explica cada elemento con ejemplos del texto.',
        type: 'development',
        points: 30,
        exam: lenguaExam2._id,
        order: 1
      },
      {
        question: 'Escribe un párrafo argumentativo (mínimo 150 palabras) sobre la importancia de la lectura en la formación de los estudiantes. Incluye una tesis, argumentos y una conclusión.',
        type: 'development',
        points: 40,
        exam: lenguaExam2._id,
        order: 2
      },
      {
        question: 'Analiza sintácticamente la siguiente oración: "Los estudiantes que estudian regularmente obtienen mejores resultados académicos." Identifica: sujeto, predicado, y clasifica las proposiciones si las hay.',
        type: 'development',
        points: 30,
        exam: lenguaExam2._id,
        order: 3
      }
    ])

    lenguaExam2.questions = lenguaQuestions2.map(q => q._id)
    await lenguaExam2.save()

    lenguaCourse.exams = [lenguaExam1._id, lenguaExam2._id]
    await lenguaCourse.save()

    // Actualizar estudiantes con cursos inscritos
    for (const student of students) {
      student.enrolledCourses = [mathCourse._id, lenguaCourse._id]
      await student.save()
    }

    console.log('✅ Seed completed successfully!')
    console.log('📚 Created courses:', mathCourse.name, lenguaCourse.name)
    console.log('👥 All students enrolled in courses')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  }
}

seed()

