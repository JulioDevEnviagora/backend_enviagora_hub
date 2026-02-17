const { supabase } = require('../../config/db');

module.exports = async (req, res) => {
  console.log('[GET] /api/colaboradores - Listando');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET] Erro:', error);
      return res.status(500).json({
        ok: false,
        error: 'Erro ao listar colaboradores',
        message: error.message,
      });
    }

    console.log(`[GET] Retornando ${data.length} colaboradores`);
    return res.json({
      ok: true,
      total: data.length,
      colaboradores: data,
    });
  } catch (err) {
    console.error('[GET] Erro interno:', err);
    return res.status(500).json({
      ok: false,
      error: 'Erro interno do servidor',
      message: err.message,
    });
  }
};
