const router = require('express').Router();
const authMiddleware = require('../../middlewares/authMiddleware');

// ===============================
// 🔎 GET /api/auth/me
// ===============================
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // Garante que retorna o campo 'nome'
    const { id, nome, email, role } = req.user;
    return res.status(200).json({
      user: { id, nome, email, role },
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
    });
  }
});

// ===============================
// 🚪 POST /api/auth/logout
// ===============================
router.post('/logout', (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.le2oap.easypanel.host',
      path: '/',
    });

    return res.status(200).json({
      message: 'Logout realizado com sucesso',
    });
  } catch (error) {
    console.error('Erro no logout:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
    });
  }
});

module.exports = router;