const { supabase } = require('../../config/db');
const bcrypt = require('bcrypt');

// 🔒 HIERARQUIA DE ROLES
const ROLE_HIERARCHY = {
  'funcionario': 1,
  'assistente': 2, 
  'rh': 3,
  'admin': 4
};

module.exports = async (req, res) => {
  const { id } = req.params;
  console.log(`[PUT] /api/colaboradores/${id}`, req.body);
  let updateData = { ...req.body };
  
  try {
    // 🔍 Buscar colaborador alvo para verificar role
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
    
    // 🔒 VALIDAR HIERARQUIA
    const userRole = req.user.role;
    const userLevel = ROLE_HIERARCHY[userRole];
    const alvoLevel = ROLE_HIERARCHY[colaboradorAlvo.role];
    
    // Ninguém pode editar alguém do mesmo nível ou superior (exceto admin)
    if (userRole !== 'admin' && userLevel <= alvoLevel) {
      return res.status(403).json({
        ok: false,
        error: `Você (${userRole}) não pode editar um ${colaboradorAlvo.role}`,
        details: 'Apenas admin pode editar alguém do mesmo nível ou superior'
      });
    }
    
    // Se estiver tentando mudar a role, validar também
    if (updateData.role && updateData.role !== colaboradorAlvo.role) {
      const novoLevel = ROLE_HIERARCHY[updateData.role];
      if (userRole !== 'admin' && userLevel <= novoLevel) {
        return res.status(403).json({
          ok: false,
          error: `Você (${userRole}) não pode promover para ${updateData.role}`,
          details: 'Apenas admin pode promover para mesmo nível ou superior'
        });
      }
    }
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
      console.log(`[PUT] /api/colaboradores/${id} - Senha atualizada com bcrypt`);
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Nenhum campo enviado para atualização',
      });
    }
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) {
      console.error('[PUT] Erro:', error);
      return res.status(500).json({
        ok: false,
        error: 'Erro ao editar colaborador',
        message: error.message,
      });
    }
    if (!data) {
      return res.status(404).json({
        ok: false,
        error: 'Colaborador não encontrado',
      });
    }
    return res.json({
      ok: true,
      message: 'Perfil atualizado com sucesso',
      colaborador: data,
    });
  } catch (err) {
    console.error('[PUT] Erro interno:', err);
    return res.status(500).json({
      ok: false,
      error: 'Erro interno do servidor',
      message: err.message,
    });
  }
};
