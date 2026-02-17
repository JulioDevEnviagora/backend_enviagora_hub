const { supabase } = require('../../config/db');
const bcrypt = require('bcrypt');

module.exports = async (req, res) => {
  const { id } = req.params;
  console.log(`[PUT] /api/colaboradores/${id}`, req.body);
  let updateData = { ...req.body };
  try {
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
