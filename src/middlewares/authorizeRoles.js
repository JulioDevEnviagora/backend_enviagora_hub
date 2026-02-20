// HIERARQUIA DE ROLES (maior número = mais poder)
const ROLE_HIERARCHY = {
  'funcionario': 1,
  'assistente': 2, 
  'rh': 3,
  'admin': 4
};

function authorizeRoles(...rolesPermitidas) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autenticado',
      });
    }

    const userRole = req.user.role;
    const userLevel = ROLE_HIERARCHY[userRole];
    
    // Verifica se o usuário tem alguma das roles permitidas ou nível superior
    const temPermissao = rolesPermitidas.some(rolePermitida => {
      const nivelPermitido = ROLE_HIERARCHY[rolePermitida];
      return userLevel >= nivelPermitido;
    });

    if (!temPermissao) {
      return res.status(403).json({
        error: 'Você não tem permissão para acessar esta rota',
      });
    }

    next();
  };
}

// Função específica para controle de exclusão hierárquico
function authorizeDelete(alvoRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const userRole = req.user.role;
    const userLevel = ROLE_HIERARCHY[userRole];
    const alvoLevel = ROLE_HIERARCHY[alvoRole];

    // Admin pode excluir qualquer um
    if (userRole === 'admin') {
      return next();
    }

    // RH não pode excluir outro RH
    if (userRole === 'rh' && alvoRole === 'rh') {
      return res.status(403).json({ 
        error: 'RH não pode excluir outro RH' 
      });
    }

    // Assistente não pode excluir outro assistente
    if (userRole === 'assistente' && alvoRole === 'assistente') {
      return res.status(403).json({ 
        error: 'Assistente não pode excluir outro assistente' 
      });
    }

    // Verifica hierarquia geral
    if (userLevel <= alvoLevel) {
      return res.status(403).json({ 
        error: 'Você não pode excluir alguém do mesmo nível ou superior' 
      });
    }

    next();
  };
}

module.exports = { authorizeRoles, authorizeDelete };