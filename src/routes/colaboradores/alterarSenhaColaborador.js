const { supabase } = require('../../config/db');
const bcrypt = require('bcrypt');

module.exports = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  console.log(`[PATCH] Alterar senha ${id}`);
  try {
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        ok: false,
        error: 'Senha deve ter pelo menos 6 caracteres',
      });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    const { data, error } = await supabase
      .from('users')
      .update({
        password: hashedPassword,
        must_change_password: false
      })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) {
      return res.status(500).json({
        ok: false,
        error: 'Erro ao alterar senha',
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
      message: 'Senha atualizada com sucesso',
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: 'Erro interno',
      message: err.message,
    });
  }
};
