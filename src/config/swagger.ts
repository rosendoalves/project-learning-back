import swaggerJsdoc from 'swagger-jsdoc'

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Plataforma Educativa API',
    version: '1.0.0',
    description: 'API REST para la plataforma educativa de secundaria argentina',
    contact: {
      name: 'Soporte API',
      email: 'soporte@plataformaeducativa.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Servidor de desarrollo'
    },
    {
      url: 'https://api.plataformaeducativa.com',
      description: 'Servidor de producción'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'ID del usuario'
          },
          username: {
            type: 'string',
            description: 'Nombre de usuario'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email del usuario'
          },
          fullName: {
            type: 'string',
            description: 'Nombre completo'
          },
          role: {
            type: 'string',
            enum: ['student', 'teacher', 'admin'],
            description: 'Rol del usuario'
          },
          enrolledCourses: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'IDs de cursos inscritos'
          }
        }
      },
      Course: {
        type: 'object',
        properties: {
          _id: {
            type: 'string'
          },
          name: {
            type: 'string',
            example: 'Matemática'
          },
          description: {
            type: 'string'
          },
          teacher: {
            type: 'string',
            example: 'Prof. María González'
          },
          year: {
            type: 'string',
            example: '3° Año'
          },
          code: {
            type: 'string',
            example: 'MAT3'
          },
          topics: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Topic'
            }
          },
          exams: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Exam'
            }
          }
        }
      },
      Topic: {
        type: 'object',
        properties: {
          _id: {
            type: 'string'
          },
          title: {
            type: 'string',
            example: 'Álgebra y Ecuaciones'
          },
          content: {
            type: 'string',
            example: 'Estudio de expresiones algebraicas...'
          },
          order: {
            type: 'number',
            example: 1
          }
        }
      },
      Exam: {
        type: 'object',
        properties: {
          _id: {
            type: 'string'
          },
          title: {
            type: 'string',
            example: 'Examen Parcial - Álgebra'
          },
          description: {
            type: 'string'
          },
          type: {
            type: 'string',
            enum: ['multiple-choice', 'development']
          },
          totalPoints: {
            type: 'number',
            example: 100
          },
          questions: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Question'
            }
          }
        }
      },
      Question: {
        type: 'object',
        properties: {
          _id: {
            type: 'string'
          },
          question: {
            type: 'string'
          },
          type: {
            type: 'string',
            enum: ['multiple-choice', 'development']
          },
          options: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          points: {
            type: 'number'
          },
          order: {
            type: 'number'
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Error message'
          },
          error: {
            type: 'string',
            example: 'Detailed error description'
          }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: {
            type: 'string',
            example: 'estudiante'
          },
          password: {
            type: 'string',
            example: '123456'
          }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'Login exitoso'
          },
          token: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          },
          user: {
            $ref: '#/components/schemas/User'
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Autenticación',
      description: 'Endpoints para registro y login de usuarios'
    },
    {
      name: 'Cursos',
      description: 'Gestión de cursos y temas'
    },
    {
      name: 'Temas',
      description: 'Gestión de temas y progreso'
    },
    {
      name: 'Exámenes',
      description: 'Gestión de exámenes y respuestas'
    },
    {
      name: 'Estadísticas',
      description: 'Estadísticas del estudiante'
    },
    {
      name: 'Health',
      description: 'Verificación del estado de los servicios'
    }
  ]
}

const options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
}

export const swaggerSpec = swaggerJsdoc(options)

