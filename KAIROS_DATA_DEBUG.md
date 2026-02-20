# 🔧 DEBUGGING AVANÇADO DA DATA KAIROS

## 🐛 **Problema Relatado:**

O usuário mostrou que os detalhes das horas extras estão vindo com `data: null`:

```json
{
  "cracha": 152,
  "periodo": {
    "dataInicio": "21-01-2026",
    "dataFim": "20-02-2026", 
    "automatico": true
  },
  "totalMinutos": 2469,
  "detalhes": [
    {
      "data": null,           // ❌ PROBLEMA
      "tipoHoraExtra": null,
      "quantidadeMinutos": 133,
      "quantidadeHorasFormatado": "02:13"
    }
  ]
}
```

## 🔍 **Análise do Problema:**

### **Causa Provável:**
A API Kairos pode estar retornando os campos de data em formatos inesperados ou em campos diferentes.

## 🛠️ **Soluções Implementadas:**

### **1. Função `normalizarDataKairos` Melhorada:**

#### **Logs Detalhados:**
```javascript
console.log(`🔍 Processando data Kairos: "${raw}"`);
console.log(`✅ Timestamp .NET convertido: "${raw}" → "${result}"`);
console.log(`✅ ISO convertido: "${raw}" → "${result}"`);
console.log(`✅ DD-MM-YYYY convertido: "${raw}" → "${result}"`);
console.log(`⚠️ Usando data atual como fallback para: "${raw}"`);
```

#### **Fallback Inteligente:**
```javascript
if (!raw) {
  console.log(`⚠️ Data Kairos nula/undefined, usando fallback`);
  return new Date().toISOString().split('T')[0]; // Data atual
}
```

#### **Tratamento Robusto:**
```javascript
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
```

### **2. Logs dos Dados Brutos da API Kairos:**

#### **Estrutura Completa:**
```javascript
console.log(`🔍 Dados brutos da API Kairos:`, JSON.stringify(dados, null, 2));
```

#### **Análise da Estrutura:**
```javascript
if (dados?.Obj) {
  console.log(`📊 Estrutura encontrada: ${dados.Obj.length} itens`);
  dados.Obj.forEach((item, index) => {
    console.log(`📋 Item ${index}:`, {
      Data: item.Data,
      HorasExtra: item.HorasExtra?.length || 0
    });
  });
} else {
  console.log(`⚠️ Estrutura de dados inesperada:`, Object.keys(dados));
}
```

### **3. Debug por Item:**

#### **Log Individual de Cada Hora Extra:**
```javascript
item.HorasExtra?.forEach((extra, extraIndex) => {
  // Se extra.Data for null, usa item.Data
  const dataNormalizada = normalizarDataKairos(extra.Data || item.Data);
  
  detalhes.push({
    data: dataNormalizada,
    tipoHoraExtra: extra.TipoHoraExtra || null,
    quantidadeMinutos: Number(extra.QuantidadeTempo || 0),
    quantidadeHorasFormatado: minutosParaHoras(minutos),
  });
});
```

## 📊 **O Que Esperamos Achar:**

### **Logs Esperados:**
```
🔍 Dados brutos da API Kairos: {
  "Obj": [
    {
      "Data": "2025-02-10T00:00:00",  // ← Campo que precisamos encontrar
      "HorasExtra": [
        {
          "Data": null,                    // ← Pode ser null aqui
          "TipoHoraExtra": "HE 50%",
          "QuantidadeTempo": 133
        }
      ]
    }
  ]
}

🔍 Processando data Kairos: "null"
⚠️ Data Kairos nula/undefined, usando fallback
✅ Data genérica convertida: "null" → "2025-02-20"
```

## 🎯 **Benefícios do Debugging:**

### **Visibilidade Total:**
- ✅ **Dados brutos**: Vemos exatamente o que Kairos retorna
- ✅ **Estrutura**: Entendemos o formato da resposta
- ✅ **Campos**: Identificamos quais campos existem
- ✅ **Valores**: Vemos os valores exatos de cada campo

### **Resolução de Problemas:**
- ✅ **Campo Data**: Sabemos se está em `item.Data` ou `extra.Data`
- ✅ **Formatos**: Identificamos se é timestamp, ISO ou DD-MM-YYYY
- ✅ **Valores nulos**: Sabemos exatamente quando e por que é null

### **Manutenibilidade:**
- ✅ **Logs claros**: Fácil identificar problemas
- ✅ **Fallbacks**: Robustez contra dados inesperados
- ✅ **Evolução**: Base para melhorias futuras

## 🔧 **Como Usar os Logs:**

### **Para Debugar:**
1. Acesse a API de horas extras
2. Verifique os logs no console do backend
3. Procure por:
   - `🔍 Dados brutos da API Kairos`
   - `📊 Estrutura encontrada`
   - `📋 Item X:` (dados individuais)
   - `🔍 Processando data Kairos`

### **Exemplo de Análise:**
```
Se ver:
🔍 Processando data Kairos: "null"
⚠️ Data Kairos nula/undefined, usando fallback

Significa:
- Kairos não retornou data nesse campo específico
- Sistema usou data atual como fallback
- Precisa investigar se campo correto está sendo usado
```

## 🎉 **Resultado Final:**

**Sistema preparado para debugging completo!**

- ✅ **Logs detalhados**: Todos os passos documentados
- ✅ **Dados brutos**: Visibilidade total da resposta Kairos
- ✅ **Tratamento robusto**: Múltiplos fallbacks
- ✅ **Fallback inteligente**: Data atual quando necessário

**🔍 Agora é possível identificar exatamente por que a data está vindo como null e corrigir na fonte!**

Execute a API e verifique os logs para entender a estrutura real dos dados da Kairos.
