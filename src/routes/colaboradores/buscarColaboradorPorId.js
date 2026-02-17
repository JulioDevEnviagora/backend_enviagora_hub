const { supabase } = require('../../config/db');

module.exports = async (req, res) => {
  const { id } = req.params;
  console.log(`[GET] /api/colaboradores/${id}`);
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error(`[GET ${id}] Erro:`, error);
      return res.status(500).json({
        ok: false,
        error: 'Erro ao buscar colaborador',
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
      colaborador: data,
    });
  } catch (err) {
    console.error(`[GET ${id}] Erro interno:`, err);
    return res.status(500).json({
      ok: false,
      error: 'Erro interno do servidor',
      message: err.message,
    });
  }
};
