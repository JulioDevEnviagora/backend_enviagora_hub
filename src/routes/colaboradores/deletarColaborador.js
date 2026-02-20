const { supabase } = require('../../config/db');
const { authorizeDelete } = require('../../middlewares/authorizeRoles');

module.exports = async (req, res) => {
  const { id } = req.params;
  console.log(`[DELETE] /api/colaboradores/${id}`);
  
  try {
    // 🔍 Buscar o colaborador alvo para verificar sua role
    const { data: colaboradorAlvo, error: erroBusca } = await supabase
      .from('users')
      .select('role, nome, email')
      .eq('id', id)
      .maybeSingle();
    
    if (erroBusca) {
      return res.status(500).json({
        ok: false,
        error: 'Erro ao buscar colaborador',
        message: erroBusca.message,
      });
    }
    
    if (!colaboradorAlvo) {
      return res.status(404).json({
        ok: false,
        error: 'Colaborador não encontrado',
      });
    }
    
    // 🔒 Verificar permissão hierárquica de exclusão
    const authorizeDeleteMiddleware = authorizeDelete(colaboradorAlvo.role);
    
    // Simular o middleware para verificar permissão
    const mockReq = { user: req.user };
    const mockRes = {
      status: (code) => ({ json: (data) => ({ status: code, ...data }) }),
      json: (data) => data
    };
    
    // Continuar apenas se tiver permissão
    const userRole = req.user.role;
    const ROLE_HIERARCHY = {
      'funcionario': 1,
      'assistente': 2, 
      'rh': 3,
      'admin': 4
    };
    
    const userLevel = ROLE_HIERARCHY[userRole];
    const alvoLevel = ROLE_HIERARCHY[colaboradorAlvo.role];
    
    // Admin pode excluir qualquer um
    if (userRole !== 'admin') {
      // RH não pode excluir outro RH
      if (userRole === 'rh' && colaboradorAlvo.role === 'rh') {
        return res.status(403).json({ 
          ok: false,
          error: 'RH não pode excluir outro RH' 
        });
      }
      
      // Assistente não pode excluir outro assistente
      if (userRole === 'assistente' && colaboradorAlvo.role === 'assistente') {
        return res.status(403).json({ 
          ok: false,
          error: 'Assistente não pode excluir outro assistente' 
        });
      }
      
      // Verifica hierarquia geral
      if (userLevel <= alvoLevel) {
        return res.status(403).json({ 
          ok: false,
          error: 'Você não pode excluir alguém do mesmo nível ou superior' 
        });
      }
    }
    
    // 🗑️ Executar exclusão
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
      
    if (error) {
      return res.status(500).json({
        ok: false,
        error: 'Erro ao deletar colaborador',
        message: error.message,
      });
    }
    
    return res.json({
      ok: true,
      message: `Colaborador ${colaboradorAlvo.nome} (${colaboradorAlvo.role}) excluído com sucesso por ${req.user.nome} (${userRole})`,
    });
    
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: 'Erro interno do servidor',
      message: err.message,
    });
  }
};
