const { supabase } = require('../../config/db');

module.exports = async (req, res) => {
  const { id } = req.params;
  console.log(`[DELETE] /api/colaboradores/${id}`);
  try {
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
      message: 'Colaborador excluído com sucesso',
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: 'Erro interno do servidor',
      message: err.message,
    });
  }
};
