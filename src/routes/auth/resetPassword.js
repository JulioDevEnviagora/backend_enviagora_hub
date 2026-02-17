const { supabase } = require('../../config/db');
const bcrypt = require('bcrypt');
const router = require('express').Router();

router.post('/', async (req, res) => {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
        return res.status(400).json({ error: 'E-mail, token e nova senha são obrigatórios' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    try {
        const emailNormalizado = email.toLowerCase().trim();

        // 1. Validar o token e expiração
        const { data: tokenData, error: tokenError } = await supabase
            .from('verification_tokens')
            .select('*')
            .eq('identifier', emailNormalizado)
            .eq('token', token)
            .maybeSingle();

        if (tokenError) throw tokenError;

        if (!tokenData) {
            return res.status(400).json({ error: 'Token inválido ou e-mail incorreto' });
        }

        // Verificar expiração
        if (new Date(tokenData.expires) < new Date()) {
            // Remove token expirado
            await supabase.from('verification_tokens').delete().eq('identifier', emailNormalizado).eq('token', token);
            return res.status(400).json({ error: 'Este link de recuperação expirou' });
        }

        // 2. Hash da nova senha
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 3. Atualizar a senha do usuário
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password: hashedPassword,
                must_change_password: false // Como ele resetou por e-mail, não precisa forçar troca de novo
            })
            .eq('email', emailNormalizado);

        if (updateError) throw updateError;

        // 4. Limpar o token usado
        await supabase
            .from('verification_tokens')
            .delete()
            .eq('identifier', emailNormalizado)
            .eq('token', token);

        return res.status(200).json({ message: 'Senha alterada com sucesso!' });

    } catch (err) {
        console.error('Erro no reset-password:', err);
        return res.status(500).json({ error: 'Erro interno ao redefinir senha' });
    }
});

module.exports = router;
