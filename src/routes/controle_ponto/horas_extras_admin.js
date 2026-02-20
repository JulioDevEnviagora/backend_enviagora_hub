const axios = require('axios');
const express = require('express');
const router = express.Router();

/* ---------------------------------------------------
   CACHE PERSISTENTE (Redis-like com Map + TTL)
--------------------------------------------------- */
const cache = new Map();
const CACHE_TTL = 30 * 1000; // 30 segundos

// Função para limpar cache expirado
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
      console.log(`🧹 Cache expirado removido: ${key}`);
    }
  }
}

// Limpar cache a cada 60 segundos
setInterval(cleanExpiredCache, 60000);

/* ---------------------------------------------------
   CONFIG API KAIROS
--------------------------------------------------- */
const HEADERS = {
  identifier: process.env.KAIROS_IDENTIFIER || "49933678000116",
  key: process.env.KAIROS_KEY || "5f4e1505-cfa3-4543-a491-5e8b4e24b708",
  "Content-Type": "application/json",
};

const axiosInstance = axios.create({
  timeout: 15000,
  httpAgent: new (require('http').Agent)({ keepAlive: true, maxSockets: 20 }),
  httpsAgent: new (require('https').Agent)({ keepAlive: true, maxSockets: 20 }),
});

/* ---------------------------------------------------
   CONCURRENCY LIMITER (máx 5 simultâneas)
--------------------------------------------------- */
const activeRequests = new Set();
const MAX_CONCURRENT = 5;

function limitConcurrency(fn) {
  return async (...args) => {
    if (activeRequests.size >= MAX_CONCURRENT) {
      await new Promise(resolve => {
        const check = () => {
          if (activeRequests.size < MAX_CONCURRENT) {
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    }
    
    const requestId = Math.random();
    activeRequests.add(requestId);
    
    try {
      const result = await fn(...args);
      return result;
    } finally {
      activeRequests.delete(requestId);
    }
  };
}

/* ---------------------------------------------------
   HELPERS DE TEMPO
--------------------------------------------------- */
function minutosParaHoras(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function minutosParaDecimal(minutos) {
  return (minutos / 60).toFixed(2);
}

/* ---------------------------------------------------
   PERÍODO AUTOMÁTICO (ÚLTIMOS 30 DIAS)
--------------------------------------------------- */
function calcularPeriodoUltimos30Dias() {
  const hoje = new Date();
  const ha30Dias = new Date();
  ha30Dias.setDate(hoje.getDate() - 30);

  const formatar = (data) => {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}-${mes}-${ano}`;
  };

  return {
    dataInicio: formatar(ha30Dias),
    dataFim: formatar(hoje),
  };
}

/* ---------------------------------------------------
   BUSCAR TODOS OS FUNCIONÁRIOS (com paginação)
--------------------------------------------------- */
async function buscarFuncionarios() {
  const funcionarios = [];
  let paginaAtual = 1;
  let totalPaginas = 1;

  do {
    const resp = await axiosInstance.post(
      "https://www.dimepkairos.com.br/RestServiceApi/People/SearchPeople",
      { Excluido: false, Pagina: paginaAtual },
      { headers: HEADERS }
    );

    // ✅ Resposta correta: resp.data.Obj (não resp.data diretamente)
    if (!resp.data?.Obj) break;

    resp.data.Obj.forEach(f => {
      if (f.Cracha) {
        funcionarios.push({
          id: f.Id,
          cracha: f.Cracha,
          matricula: f.Matricula,
          nome: f.Nome,
          cargo: f.Cargo?.Descricao || null,
        });
      }
    });

    paginaAtual = resp.data.PaginaAtual + 1;
    totalPaginas = resp.data.TotalPagina;

  } while (paginaAtual <= totalPaginas);

  return funcionarios;
}

/* ---------------------------------------------------
   BUSCAR HORAS EXTRAS DE UM FUNCIONÁRIO (COM CACHE)
--------------------------------------------------- */
const buscarHorasExtrasFuncionario = limitConcurrency(async (func, dataInicio, dataFim) => {
  const cacheKey = `horas_extras_func_${func.cracha}_${dataInicio}_${dataFim}`;
  
  // Verificar cache primeiro
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const payload = {
      IdsPessoa: [Number(func.cracha)], // ✅ Array com crachá numérico
      DataInicio: dataInicio,            // ✅ Formato DD-MM-YYYY
      DataFim: dataFim,
      RequestType: "2",                    // ✅ String "2" = busca por crachá (conforme doc Kairos)
      ResponseType: "AS400V1",
    };

    const resp = await axiosInstance.post(
      "https://www.dimepkairos.com.br/RestServiceApi/ExtraHour/GetExtraHours",
      payload,
      { headers: HEADERS }
    );

    const dados = resp.data;
    let totalMinutos = 0;

    // ✅ Parsing correto: dados.Obj[].HorasExtra[].QuantidadeTempo
    if (dados?.Obj) {
      dados.Obj.forEach(item => {
        item.HorasExtra?.forEach(extra => {
          totalMinutos += Number(extra.QuantidadeTempo || 0);
        });
      });
    }

    const resultado = {
      funcionario: {
        id: func.id,
        cracha: func.cracha,
        matricula: func.matricula,
        nome: func.nome,
        cargo: func.cargo,
      },
      totalMinutos,
      totalHorasFormatado: minutosParaHoras(totalMinutos),
      totalHorasDecimal: minutosParaDecimal(totalMinutos),
    };

    // Salvar no cache
    cache.set(cacheKey, { data: resultado, timestamp: Date.now() });
    return resultado;

  } catch (error) {
    const resultado = {
      funcionario: { cracha: func.cracha, nome: func.nome },
      erro: error.response?.data || error.message,
    };
    return resultado;
  }
});

/* ---------------------------------------------------
   ENDPOINT – PAINEL ADMINISTRATIVO
   GET /api/controle-ponto/horas-extras/admin
--------------------------------------------------- */
module.exports = async (req, res) => {
  try {
    console.log('[GET] /api/controle-ponto/horas-extras/admin');

    // Verificação de permissão
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        ok: false,
        error: 'Acesso restrito a administradores',
      });
    }

    const periodo = calcularPeriodoUltimos30Dias();
    const { dataInicio = periodo.dataInicio, dataFim = periodo.dataFim } = req.body || {};
    
    console.log(`📅 Período automático: ${dataInicio} → ${dataFim}`);
    
    // Cache global para o painel admin
    const cacheKey = `admin_painel_${dataInicio}_${dataFim}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`📋 CACHE HIT: ${cacheKey}`);
      return res.json({
        ok: true,
        data: cached.data
      });
    }

    console.log(`🌐 CACHE MISS: Processando painel admin - Período: ${dataInicio} → ${dataFim}`);

    // 1. Buscar funcionários (com paginação correta)
    console.log('🔄 Buscando funcionários...');
    const funcionarios = await buscarFuncionarios();

    if (funcionarios.length === 0) {
      return res.status(500).json({
        ok: false,
        error: 'Nenhum funcionário retornado da API Kairos',
      });
    }

    // 2. Buscar horas extras em lote (máx 5 simultâneos)
    console.log('🔄 Buscando horas extras...');
    const resultados = [];
    const chunks = [];
    for (let i = 0; i < funcionarios.length; i += 5) {
      chunks.push(funcionarios.slice(i, i + 5));
    }

    for (const chunk of chunks) {
      const lote = await Promise.all(
        chunk.map(f => buscarHorasExtrasFuncionario(f, dataInicio, dataFim))
      );
      resultados.push(...lote);
    }

    // 3. Separar erros e dados válidos
    const validos = resultados.filter(r => !r.erro);
    const erros = resultados.filter(r => r.erro);

    // 4. Ordenar por mais horas extras
    validos.sort((a, b) => b.totalMinutos - a.totalMinutos);

    // 5. Calcular resumo
    const comHorasExtras = validos.filter(f => f.totalMinutos > 0);
    const totalMinutosGeral = validos.reduce((acc, f) => acc + f.totalMinutos, 0);

    const resumo = {
      totalFuncionarios: funcionarios.length,
      funcionariosComHorasExtras: comHorasExtras.length,
      totalGeralMinutos: totalMinutosGeral,
      totalGeralHorasFormatado: minutosParaHoras(totalMinutosGeral),
      totalGeralHorasDecimal: minutosParaDecimal(totalMinutosGeral),
      mediaHorasDecimal: validos.length > 0
        ? minutosParaDecimal(Math.round(totalMinutosGeral / validos.length))
        : "0.00",
      top5: comHorasExtras.slice(0, 5),
      errosConsulta: erros.length,
      dataProcessamento: new Date().toISOString(),
    };

    // Salvar no cache
    const resultadoFinal = {
      periodo: {
        dataInicio,
        dataFim,
        automatico: true,
      },
      resumo,
      funcionarios: validos,
      ...(erros.length > 0 && { erros }),
    };

    cache.set(cacheKey, { data: resultadoFinal, timestamp: Date.now() });
    console.log(`💾 CACHE SET: ${cacheKey} (${validos.length} válidos, ${erros.length} erros)`);

    return res.json({
      ok: true,
      data: resultadoFinal,
    });

  } catch (error) {
    console.error('❌ Erro no painel administrativo:', error.response?.data || error.message);
    return res.status(500).json({
      ok: false,
      error: 'Erro interno do servidor',
      message: error.response?.data || error.message,
    });
  }
};
