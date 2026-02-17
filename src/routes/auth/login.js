const db = require('../../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = require('express').Router();

const { supabase } = db;

router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 📌 Validação básica
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email e senha são obrigatórios',
      });
    }

    const emailNormalizado = email.toLowerCase();

    // 🔎 Buscar usuário
    const { data: user, error } = await supabase
      .from('users')
      .select('id, nome, email, password, role, must_change_password')
      .eq('email', emailNormalizado)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar usuário:', error);
      return res.status(500).json({
        error: 'Erro ao processar login',
      });
    }

    if (!user) {
      return res.status(401).json({
        error: 'Email ou senha inválidos',
      });
    }

    // 🔐 Comparar senha
    const senhaValida = await bcrypt.compare(password, user.password);

    if (!senhaValida) {
      return res.status(401).json({
        error: 'Email ou senha inválidos',
      });
    }

    // 🔑 Verifica JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET não definido');
      return res.status(500).json({
        error: 'Erro de configuração do servidor',
      });
    }

    // 🎟 Gerar token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '8h',
      }
    );

    // 🍪 Definir cookie
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction, // true em produção (HTTPS)
      sameSite: isProduction ? 'none' : 'lax', // 'none' necessário para cross-origin HTTPS
      maxAge: 8 * 60 * 60 * 1000,
    });

    // 🔥 SE FOR PRIMEIRO LOGIN → FORÇA TROCA
    if (user.must_change_password) {
      return res.status(200).json({
        message: 'Troca de senha obrigatória',
        forcePasswordChange: true,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role,
        },
      });
    }

    // ✅ LOGIN NORMAL
    return res.status(200).json({
      message: 'Login realizado com sucesso',
      forcePasswordChange: false,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
    });
  }
});

module.exports = router;