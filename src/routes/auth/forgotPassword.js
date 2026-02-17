const { supabase } = require('../../config/db');
const crypto = require('crypto');
const { enviarEmailResetSenha } = require('../../utils/email');
const router = require('express').Router();

router.post('/', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'E-mail é obrigatório' });
    }

    try {
        const emailNormalizado = email.toLowerCase().trim();

        // 1. Verificar se o usuário existe
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, nome')
            .eq('email', emailNormalizado)
            .maybeSingle();

        if (userError) {
            console.error('[Forgot] Errored searching user:', userError);
            throw userError;
        }

        // Mesmo que o usuário não exista, retornamos sucesso por segurança
        if (!user) {
            return res.status(200).json({ message: 'Se o e-mail estiver cadastrado, um link de recuperação será enviado.' });
        }

        // 2. Gerar token aleatório
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hora

        // 3. Limpar tokens antigos e inserir novo
        // IMPORTANTE: Usamos .insert() sem parâmetros extras para evitar ON CONFLICT automático
        await supabase
            .from('verification_tokens')
            .delete()
            .eq('identifier', emailNormalizado);

        const { error: insertError } = await supabase
            .from('verification_tokens')
            .insert({
                identifier: emailNormalizado,
                token: token,
                expires: expires.toISOString()
            });

        if (insertError) {
            console.error('[Forgot] Insert error:', insertError);
            return res.status(500).json({ error: 'Erro ao salvar token de segurança', details: insertError });
        }

        // 4. Enviar e-mail
        await enviarEmailResetSenha(emailNormalizado, token);

        return res.status(200).json({
            message: 'Se o e-mail estiver cadastrado, um link de recuperação será enviado.'
        });

    } catch (err) {
        console.error('Erro no forgot-password:', err);
        return res.status(500).json({ error: 'Erro interno ao processar solicitação' });
    }
});

module.exports = router;
