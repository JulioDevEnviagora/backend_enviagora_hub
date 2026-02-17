const jwt = require('jsonwebtoken');
const { supabase } = require('../config/db');

async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      console.log("[Auth] Falha: Token não encontrado nos cookies.");
      return res.status(401).json({ error: "Sessão expirada ou não identificada. Por favor, tente logar novamente." });
    }

    if (!process.env.JWT_SECRET) {
      console.error("[Auth] Erro Crítico: JWT_SECRET não definido.");
      return res.status(500).json({ error: "Erro de configuração do servidor" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      console.log(`[Auth] Falha: Erro na verificação do JWT (${jwtErr.name}).`);
      return res.status(401).json({ error: "Sessão expirada ou não identificada. Por favor, tente logar novamente." });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, nome, email, role, must_change_password')
      .eq('id', decoded.id)
      .maybeSingle();

    if (error) {
      console.error("[Auth] Erro ao buscar usuário no Supabase:", error.message);
      return res.status(401).json({ error: "Sessão expirada ou não identificada. Por favor, tente logar novamente." });
    }

    if (!user) {
      console.log(`[Auth] Falha: Usuário ID ${decoded.id} não encontrado no banco.`);
      return res.status(401).json({ error: "Sessão expirada ou não identificada. Por favor, tente logar novamente." });
    }

    // 🔐 Força troca de senha
    // Liberamos as rotas de reset e qualquer rota que termine em /password (atualização de senha)
    const currentPath = req.originalUrl.split('?')[0]; // Remove query params para a checagem
    const isResetPath = currentPath.includes('/reset-password') || currentPath.endsWith('/password');

    if (user.must_change_password === true && !isResetPath) {
      console.log(`[Auth] Bloqueio: Usuário ${user.email} precisa trocar a senha. Path detectado: ${currentPath}`);
      return res.status(403).json({
        error: "Troca de senha obrigatória",
        forcePasswordChange: true
      });
    }

    req.user = user;
    next();

  } catch (err) {
    console.error("[Auth] Erro inesperado no middleware:", err);
    return res.status(401).json({ error: "Sessão expirada ou não identificada. Por favor, tente logar novamente." });
  }
}

module.exports = authMiddleware;