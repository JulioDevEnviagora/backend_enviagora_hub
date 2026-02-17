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
      console.log('[Login Debug] Email ou senha faltando no body:', req.body);
      return res.status(400).json({
        error: 'Email e senha são obrigatórios',
      });
    }

    const emailNormalizado = email.toLowerCase();
    console.log('[Login Debug] Tentativa de login para:', emailNormalizado);

    // 🔎 Buscar usuário
    const { data: user, error } = await supabase
      .from('users')
      .select('id, nome, email, password, role, must_change_password')
      .eq('email', emailNormalizado)
      .maybeSingle();

    if (error) {
      console.error('[Login Debug] Erro ao buscar usuário no Supabase:', error);
      return res.status(500).json({
        error: 'Erro ao processar login',
      });
    }

    if (!user) {
      console.log('[Login Debug] Usuário não encontrado no banco.');
      return res.status(401).json({
        error: 'Email ou senha inválidos',
      });
    }

    // 🔐 Comparar senha
    const senhaValida = await bcrypt.compare(password, user.password);

    if (!senhaValida) {
      console.log('[Login Debug] Senha incorreta.');
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
    // Para aceitar cookies em domínios diferentes (Localhost -> Prod), 
    // precisamos de SameSite=None e Secure=true.
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

    const cookieOptions = {
      httpOnly: true,
      secure: isHttps, // Fundamental para SameSite=None
      sameSite: isHttps ? 'none' : 'lax', // 'none' permite cross-site (localhost -> prod)
      path: '/',
      maxAge: 8 * 60 * 60 * 1000
    };

    // Removido o domínio explícito para melhorar a compatibilidade com o localhost
    // O navegador associará o cookie ao host do backend automaticamente.
    res.cookie('token', token, cookieOptions);

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