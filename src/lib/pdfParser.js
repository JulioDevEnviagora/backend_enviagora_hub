const pdfjsLib = require('pdfjs-dist/build/pdf');

// Configuração do worker para ambiente Node
const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.js');
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function isOnlyNumber(str) {
    return /^\d+$/.test(str.trim());
}

function isLikelyName(str) {
    return /^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ ]+$/.test(str.trim()) && str.trim().length > 5;
}

async function extractEmployeeInfoFromPDF(buffer) {
    try {
        const data = new Uint8Array(buffer);
        const loadingTask = pdfjsLib.getDocument({
            data,
            useSystemFonts: true,
            disableFontFace: true // Evita erros de fonte em ambiente Node sem canvas
        });

        const pdf = await loadingTask.promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Montagem do texto preservando espaços entre os itens
            const pageText = textContent.items
                .map(item => item.str)
                .join(" ");

            fullText += pageText + "\n";
        }

        if (!fullText.trim()) {
            return { nome: null, codigo: null, fullText: "" };
        }

        const lines = fullText
            .split("\n")
            .map(l => l.trim())
            .filter(Boolean);

        let codigo = null;
        let nome = null;

        // 🔎 1. Buscar Código (Modelo 1: CC: | Modelo 2: Final do arquivo)
        const ccMatch = fullText.match(/CC:\s*(\d+)/i);
        if (ccMatch && ccMatch[1]) {
            codigo = ccMatch[1];
        } else {
            // Se não tem CC:, tenta pegar o último número isolado do arquivo (comum no Modelo 2)
            const allNumbers = fullText.match(/\d+/g);
            if (allNumbers && allNumbers.length > 0) {
                // Pega o último número, garantindo que não seja parte de uma data ou valor monetário curto
                codigo = allNumbers[allNumbers.length - 1];
            }
        }

        // 🔎 2. Buscar Nome
        // Tentativa A: Entre "Código" e "Nome do Funcionário" (Cabeçalho)
        const nomeCabecalhoRegex = /Código\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{5,100}?)\s+Nome/i;
        const nomeCabecalhoMatch = fullText.match(nomeCabecalhoRegex);

        if (nomeCabecalhoMatch && nomeCabecalhoMatch[1].trim().length > 5) {
            nome = nomeCabecalhoMatch[1].trim().replace(/\s+/g, ' ');
        }

        // Tentativa B: Blocos de letras maiúsculas no final do arquivo (Rodapé - Modelo 2)
        if (!nome || nome.includes("FUNCIONÁRIO")) {
            // Procura sequências de palavras em maiúsculas com mais de 10 caracteres antes do código
            const blocosMaiusculos = fullText.match(/[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{10,}/g);
            if (blocosMaiusculos) {
                // Filtra labels comuns e pega o último bloco que parece um nome
                const nomesPossiveis = blocosMaiusculos
                    .map(b => b.trim().replace(/\s+/g, ' '))
                    .filter(b => b.length > 10 && !b.includes("DECLARO") && !b.includes("ASSINATURA"));

                if (nomesPossiveis.length > 0) {
                    nome = nomesPossiveis[nomesPossiveis.length - 1];
                }
            }
        }

        // 🔎 Fallback: Se ainda falhou, tenta o loop linha a linha legado
        if (!codigo || !nome) {
            for (let i = 0; i < lines.length; i++) {
                const current = lines[i].toUpperCase();
                if (current.includes("CÓDIGO") || current.includes("CODIGO")) {
                    if (!codigo) {
                        if (i > 0 && isOnlyNumber(lines[i - 1])) codigo = lines[i - 1];
                        else {
                            const m = lines[i].match(/\d+/);
                            if (m) codigo = m[0];
                        }
                    }
                    if (!nome) {
                        for (let j = i; j < i + 5 && j < lines.length; j++) {
                            const lineU = lines[j].toUpperCase();
                            if (isLikelyName(lines[j]) && !lineU.includes("CÓDIGO") && !lineU.includes("NOME")) {
                                nome = lines[j];
                                break;
                            }
                        }
                    }
                }
                if (codigo && nome) break;
            }
        }

        return {
            nome,
            codigo,
            fullText
        };

    } catch (err) {
        console.error("Erro ao processar PDF com PDF.js:", err);
        return { nome: null, codigo: null, fullText: "Erro na extração: " + err.message };
    }
}

module.exports = {
    extractEmployeeInfoFromPDF
};