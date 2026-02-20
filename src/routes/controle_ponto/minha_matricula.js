const { supabase } = require('../../config/db');

module.exports = async (req, res) => {
  try {
    console.log('[GET] /api/controle-ponto/minha-matricula');

    // Busca os dados do usuário logado
    const { data: usuario, error } = await supabase
      .from('users')
      .select('id, nome, email, cpf, matricula')
      .eq('id', req.user.id)
      .single();

    if (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      return res.status(500).json({
        ok: false,
        error: 'Erro ao buscar dados do usuário'
      });
    }

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        error: 'Usuário não encontrado'
      });
    }

    return res.json({
      ok: true,
      data: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cpf: usuario.cpf,
        matricula: usuario.matricula || null,
        mensagem: usuario.matricula 
          ? 'Matrícula encontrada' 
          : 'Matrícula não cadastrada. Contate o RH.'
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar matrícula:', error.message);
    return res.status(500).json({
      ok: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
};
