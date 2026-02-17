const jwt = require('jsonwebtoken');
const { supabase } = require('../config/db');

async function authMiddleware(req, res, next) {
  try {

    const token = req.cookies?.token;

    // 🔥 Se não tem token
    if (!token) {
      // Se é rota /me → apenas retorna 401 silencioso
      if (req.originalUrl.startsWith('/api/auth/me')) {
        return res.status(401).json({ authenticated: false });
      }

      return res.status(401).json({
        error: "Sessão expirada ou não identificada."
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        error: "Erro de configuração do servidor"
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        error: "Sessão expirada ou não identificada."
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, nome, email, role, must_change_password')
      .eq('id', decoded.id)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({
        error: "Sessão expirada ou não identificada."
      });
    }

    req.user = user;
    next();

  } catch (err) {
    return res.status(401).json({
      error: "Sessão expirada ou não identificada."
    });
  }
}
module.exports = authMiddleware;