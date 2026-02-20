const axios = require('axios');
const express = require('express');
const router = express.Router();

/* ---------------------------------------------------
   CACHE IN MEMORY (30 segundos)
--------------------------------------------------- */
const cache = new Map();
const CACHE_TTL = 30 * 1000; // 30 segundos

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
      await new Promise((resolve) => {
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

/**
 * Normaliza a data retornada pela API Kairos para o formato ISO YYYY-MM-DD.
 * A Kairos pode retornar:
 *   - "/Date(1707523200000)/"  (timestamp .NET)
 *   - "2025-02-10T00:00:00"   (ISO com hora)
 *   - "2025-02-10"            (ISO só data)
 *   - "10-02-2025"            (DD-MM-YYYY)
 *   - null/undefined           (quando não existe)
 */
function normalizarDataKairos(raw) {
  if (!raw) {
    console.log(`⚠️ Data Kairos nula/undefined, usando fallback`);
    return new Date().toISOString().split('T')[0]; // Data atual como fallback
  }

  console.log(`🔍 Processando data Kairos: "${raw}"`);

  // Timestamp .NET: /Date(timestamp)/
  const dotNetMatch = String(raw).match(/\/Date\((\d+)\)\//);
  if (dotNetMatch) {
    const d = new Date(Number(dotNetMatch[1]));
    if (!isNaN(d.getTime())) {
      const result = d.toISOString().split('T')[0];
      console.log(`✅ Timestamp .NET convertido: "${raw}" → "${result}"`);
      return result;
    }
  }

  // ISO: "2025-02-10T00:00:00" ou "2025-02-10"
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const result = raw.split('T')[0];
    console.log(`✅ ISO convertido: "${raw}" → "${result}"`);
    return result;
  }

  // DD-MM-YYYY (formato Kairos comum)
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [dia, mes, ano] = raw.split('-');
    const result = `${ano}-${mes}-${dia}`;
    console.log(`✅ DD-MM-YYYY convertido: "${raw}" → "${result}"`);
    return result;
  }

  // Fallback: tenta converter como data genérica
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const result = d.toISOString().split('T')[0];
      console.log(`✅ Data genérica convertida: "${raw}" → "${result}"`);
      return result;
    }
  } catch (e) {
    console.log(`❌ Falha ao converter data: "${raw}"`);
  }

  console.log(`⚠️ Usando data atual como fallback para: "${raw}"`);
  return new Date().toISOString().split('T')[0]; // Data atual como último fallback
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
   FUNÇÃO PRINCIPAL – buscar horas extras individuais
   COM CACHE E CONCORRÊNCIA CONTROLADA
--------------------------------------------------- */
const buscarHorasExtrasIndividuais = limitConcurrency(
  async (cracha, dataInicio, dataFim) => {
    const cacheKey = `horas_extras_${cracha}_${dataInicio}_${dataFim}`;

    // Verificar cache primeiro
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`📋 CACHE HIT: ${cacheKey}`);
      return cached.data;
    }

    console.log(
      `🌐 CACHE MISS: Buscando na API Kairos - Crachá: ${cracha} | Período: ${dataInicio} → ${dataFim}`
    );

    const payload = {
      IdsPessoa: [Number(cracha)],     // ✅ Array com crachá numérico
      DataInicio: dataInicio,          // ✅ Formato DD-MM-YYYY
      DataFim: dataFim,
      RequestType: "2",                // ✅ String "2" = busca por crachá (conforme doc Kairos)
      ResponseType: "AS400V1",
    };

    const response = await axiosInstance.post(
      "https://www.dimepkairos.com.br/RestServiceApi/ExtraHour/GetExtraHours",
      payload,
      { headers: HEADERS }
    );

    const dados = response.data;
    console.log(`🔍 Dados brutos da API Kairos:`, JSON.stringify(dados, null, 2));
    
    let totalMinutos = 0;
    const detalhes = [];

    // ✅ Estrutura REAL da API Kairos: Array com Dia/Mes/Ano separados
    if (dados?.Obj && Array.isArray(dados.Obj)) {
      console.log(`📊 Estrutura encontrada: ${dados.Obj.length} itens`);
      
      dados.Obj.forEach((item, index) => {
        console.log(`📋 Item ${index}:`, {
          Numero: item.Numero,
          Ano: item.Ano,
          Mes: item.Mes,
          Dia: item.Dia,
          HorasExtra: item.HorasExtra?.length || 0
        });
        
        // Monta a data no formato YYYY-MM-DD
        const dataFormatada = `${item.Ano}-${String(item.Mes).padStart(2, '0')}-${String(item.Dia).padStart(2, '0')}`;
        console.log(`📅 Data formatada: ${dataFormatada} (Ano: ${item.Ano}, Mês: ${item.Mes}, Dia: ${item.Dia})`);
        
        // Processa as horas extras deste dia
        if (item.HorasExtra && Array.isArray(item.HorasExtra)) {
          item.HorasExtra.forEach((extra) => {
            const minutos = Number(extra.QuantidadeTempo || 0);
            totalMinutos += minutos;
            detalhes.push({
              data: dataFormatada, // ✅ Data formatada corretamente
              tipoHoraExtra: extra.TipoHoraExtra || extra.Descricao || null,
              quantidadeMinutos: minutos,
              quantidadeHorasFormatado: minutosParaHoras(minutos),
            });
          });
        }
      });
    } else {
      console.log(`⚠️ Estrutura de dados inesperada:`, Object.keys(dados));
    }

    const resultado = {
      totalMinutos,
      totalHorasFormatado: minutosParaHoras(totalMinutos),
      totalHorasDecimal: minutosParaDecimal(totalMinutos),
      detalhes,
    };

    // Salvar no cache
    cache.set(cacheKey, { data: resultado, timestamp: Date.now() });
    console.log(
      `💾 CACHE SET: ${cacheKey} (${totalMinutos} minutos)`
    );

    return resultado;
  }
);

/* ---------------------------------------------------
   ENDPOINT
   GET /api/controle-ponto/horas-extras/:cracha
--------------------------------------------------- */
module.exports = async (req, res) => {
  try {
    const cracha = req.params.cracha || req.params.matricula;

    console.log(
      `[GET] /api/controle-ponto/horas-extras/${cracha} | user: ${req.user?.id}`
    );

    // ✅ Validações de entrada
    if (!cracha || cracha === 'undefined' || cracha === 'null') {
      return res.status(400).json({
        ok: false,
        error: 'Crachá/matrícula é obrigatório e deve ser um valor válido',
      });
    }

    if (isNaN(Number(cracha))) {
      return res.status(400).json({
        ok: false,
        error: `Crachá deve ser um número válido, recebido: '${cracha}'`,
      });
    }

    const periodo = calcularPeriodoUltimos30Dias();
    const { dataInicio = periodo.dataInicio, dataFim = periodo.dataFim } = req.body || {};

    console.log(`📅 Período automático: ${dataInicio} → ${dataFim}`);

    const resultado = await buscarHorasExtrasIndividuais(
      cracha,
      dataInicio,
      dataFim
    );

    return res.json({
      ok: true,
      data: {
        cracha: Number(cracha),
        periodo: {
          dataInicio,
          dataFim,
          automatico: true,
        },
        totalMinutos: resultado.totalMinutos,
        totalHorasFormatado: resultado.totalHorasFormatado,
        totalHorasDecimal: resultado.totalHorasDecimal,
        detalhes: resultado.detalhes,
      },
    });
  } catch (error) {
    console.error(
      '❌ Erro ao buscar horas extras individuais:',
      error.response?.data || error.message
    );
    return res.status(500).json({
      ok: false,
      error: 'Erro interno do servidor',
      message: error.response?.data || error.message,
    });
  }
};