import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.model'

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, email, fullName } = req.body

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe' })
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear nuevo usuario
    const user = new User({
      username,
      password: hashedPassword,
      email,
      fullName,
      role: 'student'
    })

    await user.save()

    // Generar token
    const JWT_SECRET = process.env.JWT_SECRET || 'default_secret'
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al registrar usuario', error: error.message })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    // Buscar usuario
    const user = await User.findOne({ username })
    if (!user) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' })
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' })
    }

    // Generar token
    const JWT_SECRET = process.env.JWT_SECRET || 'default_secret'
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        enrolledCourses: user.enrolledCourses
      }
    })
  } catch (error: any) {
    res.status(500).json({ message: 'Error al iniciar sesión', error: error.message })
  }
}

export const getProfile = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password')
      .populate('enrolledCourses', 'name code teacher year')

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    res.json(user)
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener perfil', error: error.message })
  }
}

