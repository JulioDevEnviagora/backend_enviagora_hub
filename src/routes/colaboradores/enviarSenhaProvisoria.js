const { supabase } = require('../../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { enviarEmailAcesso } = require('../../utils/email');

function gerarSenhaProvisoria(tamanho = 10) {
    return crypto.randomBytes(tamanho)
        .toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, tamanho);
}

module.exports = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Buscar dados do usuário
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('nome, email')
            .eq('id', id)
            .maybeSingle();

        if (fetchError || !user) {
            return res.status(404).json({ error: 'Colaborador não encontrado' });
        }

        // 2. Gerar nova senha provisória
        const senhaProvisoria = gerarSenhaProvisoria();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(senhaProvisoria, salt);

        // 3. Atualizar no banco
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password: hashedPassword,
                must_change_password: true
            })
            .eq('id', id);

        if (updateError) {
            return res.status(500).json({ error: 'Erro ao atualizar senha no banco' });
        }

        // 4. Enviar e-mail
        try {
            await enviarEmailAcesso(user.email, user.nome, senhaProvisoria);
        } catch (emailError) {
            console.error('Erro ao reenviar e-mail:', emailError);
            return res.status(500).json({ error: 'E-mail não pôde ser enviado, mas a senha foi resetada.' });
        }

        return res.status(200).json({
            message: 'Senha provisória enviada com sucesso para ' + user.email
        });

    } catch (error) {
        console.error('Erro na rota de reenvio de senha:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
