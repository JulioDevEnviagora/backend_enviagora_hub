const express = require("express");
const axios = require("axios");
const router = express.Router();

/* ---------------------------------------------------
   CACHE IN MEMORY
--------------------------------------------------- */
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/* ---------------------------------------------------
   CONCURRENCY LIMITER
--------------------------------------------------- */
async function promisePool(items, max, fn) {
  const results = [];
  const executing = [];

  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);

    if (executing.length >= max) {
      await Promise.race(executing);
    }

    const e = p.then(() => {
      executing.splice(executing.indexOf(e), 1);
    });

    executing.push(e);
  }

  return Promise.all(results);
}

/* ---------------------------------------------------
   CONFIG API KAIROS
--------------------------------------------------- */
const HEADERS = {
  identifier: "49933678000116",
  key: "5f4e1505-cfa3-4543-a491-5e8b4e24b708",
  "Content-Type": "application/json",
};

const axiosInstance = axios.create({
  headers: HEADERS,
  timeout: 10000,
  httpAgent: new (require("http").Agent)({ keepAlive: true }),
  httpsAgent: new (require("https").Agent)({ keepAlive: true }),
});

/* ---------------------------------------------------
   HELPERS DE TEMPO
--------------------------------------------------- */
function minutosParaHoras(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function minutosParaDecimal(minutos) {
  return (minutos / 60).toFixed(2);
}

/* ---------------------------------------------------
   🔥 FUNÇÃO QUE BUSCA FUNCIONÁRIOS
--------------------------------------------------- */
async function buscarFuncionarios() {
  const funcionarios = [];
  let paginaAtual = 1;
  let totalPaginas = 1;

  try {
    do {
      const payload = {
        Excluido: false,   // SOMENTE funcionários ativos
        Pagina: paginaAtual
      };

      const resp = await axiosInstance.post(
        "https://www.dimepkairos.com.br/RestServiceApi/People/SearchPeople",
        payload
      );

      if (!resp.data?.Obj) break;

      // adicionar funcionários retornados
      resp.data.Obj.forEach(f => {
        if (f.Cracha) {
          funcionarios.push({
            id: f.Id,
            cracha: f.Cracha,
            matricula: f.Matricula,
            nome: f.Nome,
            cargo: f.Cargo?.Descricao || null,
            status: f.PessoaStatus
          });
        }
      });

      // atualizar paginação
      paginaAtual = resp.data.PaginaAtual + 1;
      totalPaginas = resp.data.TotalPagina;

    } while (paginaAtual <= totalPaginas);

    return funcionarios;
  } catch (err) {
    console.error("Erro ao buscar funcionários:", err.response?.data || err);
    return [];
  }
}


/* ---------------------------------------------------
   🔥 FUNÇÃO PARA CALCULAR PERÍODO DOS ÚLTIMOS 30 DIAS
--------------------------------------------------- */
function calcularPeriodoUltimos30Dias() {
  const hoje = new Date();
  const ha30Dias = new Date();
  ha30Dias.setDate(hoje.getDate() - 30);

  const formatarData = (data) => {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}-${mes}-${ano}`;
  };

  return {
    dataInicio: formatarData(ha30Dias),
    dataFim: formatarData(hoje)
  };
}

/* ---------------------------------------------------
   ROTA PRINCIPAL – horas extras
--------------------------------------------------- */
router.post("/horas-extras", async (req, res) => {
  // 🚀 USAR PERÍODO AUTOMÁTICO DOS ÚLTIMOS 30 DIAS
  const periodo = calcularPeriodoUltimos30Dias();
  const { dataInicio = periodo.dataInicio, dataFim = periodo.dataFim } = req.body;

  console.log(`📅 Buscando horas extras de ${dataInicio} até ${dataFim}`);

  // 🚀 VERIFICAR CACHE PRIMEIRO
  const cacheKey = `${dataInicio}-${dataFim}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("CACHE HIT:", cacheKey);
    return res.json(cached.data);
  }

  console.log("BUSCANDO FUNCIONÁRIOS...");
  const funcionarios = await buscarFuncionarios();

  if (funcionarios.length === 0) {
    return res.status(500).json({
      erro: "Nenhum funcionário retornado da API People/SearchPeople",
    });
  }

  console.log(`Encontrados ${funcionarios.length} funcionários.`);

  /* ---- FUNÇÃO PARA PROCESSAR CADA FUNCIONÁRIO ---- */
  async function processarFuncionario(func) {
    try {
      const payload = {
        IdsPessoa: [func.cracha],
        DataInicio: dataInicio,
        DataFim: dataFim,
        RequestType: "2",  // 2 = busca por crachá (conforme doc Kairos)
        ResponseType: "AS400V1",
      };

      const resp = await axiosInstance.post(
        "https://www.dimepkairos.com.br/RestServiceApi/ExtraHour/GetExtraHours",
        payload
      );

      const dados = resp.data;
      let totalMinutos = 0;

      if (dados?.Obj) {
        dados.Obj.forEach(item => {
          item.HorasExtra?.forEach(extra => {
            totalMinutos += Number(extra.QuantidadeTempo || 0);
          });
        });
      }

      return {
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
        detalhes: dados.Obj || [],
      };
    } catch (error) {
      return {
        funcionario: func,
        erro: error.response?.data || error.message,
      };
    }
  }

  /* ---- EXECUÇÃO EM LOTE (30 simultâneos) ---- */
  const resultados = await promisePool(funcionarios, 30, processarFuncionario);

  const data = {
    periodo: {
      dataInicio,
      dataFim,
      automatico: !req.body.dataInicio || !req.body.dataFim
    },
    totalFuncionarios: funcionarios.length,
    resultados,
  };

  cache.set(cacheKey, { data, timestamp: Date.now() });

  res.json(data);
});

module.exports = router;
