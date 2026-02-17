require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

//Teste de conexão
async function testarConexao() {
  try {
    console.log('🔎 Testando conexão com Supabase...');

    const { error } = await supabase
      .from('users')
      .select('id', { head: true })
      .limit(1);

    if (error) {
      throw error;
    }

    console.log('✅ Conexão com Supabase OK!');
  } catch (err) {
    console.error('❌ Falha na conexão:', err.message);
  }
}

// testarConexao(); // Removido para controle via server.js

module.exports = {
  supabase,
  testarConexao
};