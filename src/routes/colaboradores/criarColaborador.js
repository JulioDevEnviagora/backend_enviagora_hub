const { supabase } = require('../../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { enviarEmailAcesso } = require('../../utils/email');

// 🔒 HIERARQUIA DE ROLES
const ROLE_HIERARCHY = {
  'funcionario': 1,
  'assistente': 2, 
  'rh': 3,
  'admin': 4
};

function gerarSenhaProvisoria(tamanho = 10) {
  return crypto.randomBytes(tamanho)
  .toString('base64')
  .replace(/[^a-zA-Z0-9]/g, '')
  .slice(0, tamanho);
}

module.exports = async (req, res) => {
  try {
    const {
      nome,
      cpf,
      email,
      role,
      codigo_holerite,
      matricula,
      cnpj_registro,
      setor,
      cargo,
      telefone_pessoal,
      telefone_emergencial,
      data_nascimento,
      idade,
      endereco_completo,
      bairro,
      cidade
    } = req.body;

    if (!nome || !cpf || !email) {
      return res.status(400).json({
        error: 'Nome, CPF e email são obrigatórios',
      });
    }

    // � VALIDAR HIERARQUIA DE ROLES
    const userRole = req.user.role;
    const userLevel = ROLE_HIERARCHY[userRole];
    const novoRole = role || 'funcionario';
    const novoLevel = ROLE_HIERARCHY[novoRole];

    // Ninguém pode criar alguém do mesmo nível ou superior (exceto admin)
    if (userRole !== 'admin' && userLevel <= novoLevel) {
      return res.status(403).json({
        error: `Você (${userRole}) não pode criar um ${novoRole}`,
        details: 'Apenas admin pode criar alguém do mesmo nível ou superior'
      });
    }

    // �🔎 Verifica duplicidade
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .or(`cpf.eq.${cpf},email.eq.${email}`);

    if (checkError) {
      return res.status(500).json({
        error: 'Erro ao verificar usuário existente',
        message: checkError.message
      });
    }

    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({
        error: 'Usuário já cadastrado com este CPF ou email',
      });
    }

    // 🔐 Gera senha provisória
    const senhaProvisoria = gerarSenhaProvisoria();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(senhaProvisoria, salt);

    // 💾 Cria usuário
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          nome,
          cpf,
          email,
          password: hashedPassword,
          role: role || 'funcionario',
          must_change_password: true,
          matricula: matricula || null,
          codigo_holerite: codigo_holerite || null,
          cnpj_registro: cnpj_registro || null,
          setor: setor || null,
          cargo: cargo || null,
          telefone_pessoal: telefone_pessoal || null,
          telefone_emergencial: telefone_emergencial || null,
          data_nascimento: data_nascimento || null,
          idade: idade || null,
          endereco_completo: endereco_completo || null,
          bairro: bairro || null,
          cidade: cidade || null,
        },
      ])
      .select('id, nome, email')
      .single();

    if (insertError) {
      return res.status(500).json({
        error: 'Erro ao cadastrar usuário',
        message: insertError.message,
      });
    }

    // 📧 Envia email (SE falhar, remove usuário criado)
    try {
      await enviarEmailAcesso(email, nome, senhaProvisoria);
    } catch (emailError) {

      // rollback manual
      await supabase
        .from('users')
        .delete()
        .eq('id', newUser.id);

      return res.status(500).json({
        error: 'Erro ao enviar email. Usuário não foi criado.',
        message: emailError.message
      });
    }

    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso e email enviado.',
      user: newUser
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message,
    });
  }
};