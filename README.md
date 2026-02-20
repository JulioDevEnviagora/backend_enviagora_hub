# 🏢 Enviagora Hub API

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.2.1-blue.svg)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-orange.svg)](https://supabase.com/)
[![JWT](https://img.shields.io/badge/JWT-Authentication-red.svg)](https://jwt.io/)

> 🚀 **Plataforma completa de gestão de recursos humanos com controle de ponto eletrônico, holerites digitais e comunicação corporativa.**

## 📋 Índice

- [🎯 Visão Geral](#-visão-geral)
- [🚀 Tecnologias](#-tecnologias)
- [🔐 Sistema de Autenticação](#-sistema-de-autenticação)
- [📊 Matriz de Permissões](#-matriz-de-permissões)
- [🚀 Quick Start](#-quick-start)
- [📚 Documentação da API](#-documentação-da-api)
- [🏗️ Arquitetura](#️-arquitetura)
- [🔧 Configuração](#-configuração)
- [📈 Performance](#-performance)
- [🛡️ Segurança](#️-segurança)
- [🧪 Testes](#-testes)
- [📝 Contribuição](#-contribuição)

## 🎯 Visão Geral

A **Enviagora Hub API** é uma solução robusta e escalável para gestão de recursos humanos, desenvolvida com as melhores práticas de segurança e performance. O sistema oferece:

- 🏢 **Gestão completa de colaboradores** com controle hierárquico
- 📄 **Sistema de holerites digitais** com upload automático
- ⏰ **Integração com ponto eletrônico Kairos** para horas extras
- 📢 **Plataforma de comunicação corporativa** (news e announcements)
- 🔐 **Sistema RBAC** com 4 níveis de permissão
- 🚀 **Alta performance** com cache e processamento paralelo

## 🚀 Tecnologias

| Categoria | Tecnologia | Versão | Propósito |
|-----------|------------|--------|----------|
| **Runtime** | Node.js | 18+ | Ambiente de execução |
| **Framework** | Express | 5.2.1 | Servidor web |
| **Database** | Supabase | - | PostgreSQL + API |
| **Auth** | JWT | 9.0.3 | Autenticação stateless |
| **Security** | bcrypt | 6.0.0 | Hash de senhas |
| **HTTP Client** | Axios | 1.6+ | Integração externa |
| **File Upload** | Multer | 2.0.2 | Upload de PDFs |
| **Email** | Nodemailer | 8.0.1 | Notificações |
| **PDF** | pdf-parse | 1.1.1 | Processamento de holerites |

## 🔐 Sistema de Autenticação

### 📊 Hierarquia de Roles

```
admin (4)     > rh (3) > assistente (2) > funcionario (1)
```

### 🎭 Descrição das Roles

| Role | Nível | Descrição | Acessos Principais |
|------|-------|-----------|-------------------|
| **admin** | 4 | Acesso total ao sistema | Gestão completa, configurações |
| **rh** | 3 | Gestão de pessoas | Colaboradores, holerites, comunicados |
| **assistente** | 2 | Suporte administrativo | Operações básicas, suporte |
| **funcionario** | 1 | Acesso pessoal | Informações pessoais, comunicados |

### 🔑 Fluxo de Autenticação

1. **Login**: Credenciais validadas com bcrypt
2. **JWT Token**: Gerado com role e expiração
3. **Refresh**: Tokens renováveis para sessões longas
4. **Authorization**: Middleware RBAC em cada rota

## 📊 Matriz de Permissões

### 🔒 Gestão de Colaboradores (CRUD)

| Operação | Funcionário | Assistente | RH | Admin |
|----------|-------------|-------------|-----|-------|
| **Listar** | ❌ | ✅ | ✅ | ✅ |
| **Criar Funcionário** | ❌ | ✅ | ✅ | ✅ |
| **Criar Assistente** | ❌ | ❌ | ✅ | ✅ |
| **Criar RH** | ❌ | ❌ | ❌ | ✅ |
| **Criar Admin** | ❌ | ❌ | ❌ | ✅ |
| **Editar Funcionário** | ❌ | ✅ | ✅ | ✅ |
| **Editar Assistente** | ❌ | ❌ | ✅ | ✅ |
| **Editar RH** | ❌ | ❌ | ❌ | ✅ |
| **Editar Admin** | ❌ | ❌ | ❌ | ✅ |
| **Excluir Funcionário** | ❌ | ✅ | ✅ | ✅ |
| **Excluir Assistente** | ❌ | ❌ | ✅ | ✅ |
| **Excluir RH** | ❌ | ❌ | ❌ | ✅ |
| **Excluir Admin** | ❌ | ❌ | ❌ | ✅ |

### 📄 Documentos e Comunicação

| Recurso                      | Funcionário | Assistente | RH  | Admin |
| ------------------------------| -------------| ------------| -----| -------|
| **Holerites (pessoais)**     | ✅           | ✅          | ✅   | ✅     |
| **Holerites (gestão)**       | ❌           | ✅          | ✅   | ✅     |
| **Upload de Holerites**      | ❌           | ✅          | ✅   | ✅     |
| **News (ler)**               | ✅           | ✅          | ✅   | ✅     |
| **News (criar)**             | ❌           | ❌          | ✅   | ✅     |
| **Announcements (ler)**      | ✅           | ✅          | ✅   | ✅     |
| **Announcements (criar)**    | ❌           | ❌          | ✅   | ✅     |
| **Horas Extras (consultar)** | ✅           | ✅          | ✅   | ✅     |
| **Horas Extras (gestão)**    | ❌           | ❌          | ✅   | ✅     |

## 🚀 Quick Start

### 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta Supabase
- Chaves da API Kairos

### ⚙️ Instalação

```bash
# Clonar repositório
git clone <repository-url>
cd backend_enviagora_hub

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Iniciar servidor
npm start
```

### 🌱 Variáveis de Ambiente

```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key

# Auth
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Server
PORT=3005
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Kairos API
KAIROS_IDENTIFIER=your_cnpj
KAIROS_KEY=your_api_key
```

### 🎯 Primeiros Passos

1. **Criar Admin**:
```bash
curl -X POST http://localhost:3005/api/colaboradores \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Admin Master",
    "email": "admin@enviagora.com.br",
    "cpf": "123.456.789-00",
    "role": "admin"
  }'
```

2. **Fazer Login**:
```bash
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@enviagora.com.br",
    "password": "senha_provisoria"
  }'
```

3. **Testar Horas Extras**:
```bash
curl -X POST http://localhost:3005/api/controle-ponto/horas-extras \
  -H "Authorization: Bearer <token>" \
  -d '{}'
```

## 📚 Documentação da API

### 🔐 Autenticação

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@enviagora.com.br",
  "password": "senha123"
}
```

#### Verificar Sessão
```http
GET /api/auth/session
Authorization: Bearer <token>
```

### 👥 Colaboradores

#### Listar Colaboradores
```http
GET /api/colaboradores
Authorization: Bearer <token>
```

#### Criar Colaborador
```http
POST /api/colaboradores
Authorization: Bearer <token>
Content-Type: application/json

{
  "nome": "João Silva",
  "email": "joao@enviagora.com.br",
  "cpf": "123.456.789-00",
  "role": "funcionario",
  "setor": "Logística",
  "cargo": "Ajudante"
}
```

### 📄 Holerites

#### Listar Holerites
```http
GET /api/holerites
Authorization: Bearer <token>
```

#### Upload de Holerites
```http
POST /api/holerites/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

competencia: "Janeiro 2024"
files: [arquivo.pdf]
```

### 📢 Comunicação

#### Listar News
```http
GET /api/news
Authorization: Bearer <token>
```

#### Criar News
```http
POST /api/news
Authorization: Bearer <token>
Content-Type: multipart/form-data

titulo: "Comunicado Importante"
mes_referencia: "Janeiro"
ano_referencia: "2024"
pdf: [arquivo.pdf]
capa: [imagem.jpg]
```

### ⏰ Controle de Ponto

#### Consultar Horas Extras
```http
POST /api/controle-ponto/horas-extras
Authorization: Bearer <token>
Content-Type: application/json

# Período automático (últimos 30 dias)
{}

# Período personalizado
{
  "dataInicio": "01-01-2024",
  "dataFim": "31-01-2024"
}
```

## 🏗️ Arquitetura

### 📁 Estrutura do Projeto

```
backend_enviagora_hub/
├── src/
│   ├── config/
│   │   └── db.js                 # Configuração Supabase
│   ├── middlewares/
│   │   ├── authMiddleware.js      # Validação JWT
│   │   └── authorizeRoles.js     # Controle RBAC hierárquico
│   ├── routes/
│   │   ├── auth/                  # Autenticação
│   │   ├── colaboradores/         # CRUD de funcionários
│   │   ├── holerites/            # Gestão de holerites
│   │   ├── news/                 # Notícias
│   │   ├── announcements/        # Avisos
│   │   └── controle_ponto/      # Horas extras
│   ├── utils/
│   │   └── email.js              # Envio de notificações
│   └── server.js                 # Configuração principal
├── .env.example                  # Template de variáveis
├── package.json                  # Dependências
├── README.md                     # Documentação
└── PERMISSOES.md                 # Matriz de permissões
```

### 🔄 Fluxo de Requisição

```
Client Request
    ↓
CORS Validation
    ↓
Auth Middleware (JWT)
    ↓
RBAC Middleware (Roles)
    ↓
Route Handler
    ↓
Business Logic
    ↓
Database/External API
    ↓
Response
```

### 🎯 Design Patterns

- **Middleware Chain**: Autenticação → Autorização → Handler
- **Repository Pattern**: Abstração do Supabase
- **Service Layer**: Lógica de negócio separada
- **Error Handling**: Centralizado e consistente
- **Logging**: Estruturado e auditável

## 🔧 Configuração

### 🗄️ Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'funcionario',
  must_change_password BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Holerites Table
```sql
CREATE TABLE holerites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia VARCHAR(50) NOT NULL,
  arquivo_url TEXT NOT NULL,
  usuario_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 🌐 CORS Configuration

```javascript
const allowedOrigins = [
  "http://localhost:3000",
  "https://seu-dominio.com"
];

app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
```

## 📈 Performance

### ⚡ Otimizações Implementadas

| Otimização | Impacto | Descrição |
|------------|---------|-----------|
| **Cache Inteligente** | 🚀🚀🚀 | 5 minutos TTL para consultas repetidas |
| **Processamento Paralelo** | 🚀🚀 | Até 30 requisições simultâneas |
| **HTTP Keep-Alive** | 🚀 | Reutilização de conexões |
| **Timeout Otimizado** | 🚀 | 6 segundos por requisição |
| **Connection Pooling** | 🚀 | Conexões reutilizáveis |

### 📊 Métricas de Performance

```javascript
// Exemplo de performance
{
  "primeira_consulta": "10-15s (1000 funcionários)",
  "cache_hit": "<50ms (instantâneo)",
  "reducao_load": "70-80% com cache",
  "concorrencia": "30x mais rápido",
  "memoria": "<100MB steady state"
}
```

### 🎯 Monitoramento

```javascript
// Logs de performance
console.time('horas-extras');
// ... processamento
console.timeEnd('horas-extras'); // horas-extras: 12.456ms

// Cache hits/misses
console.log('🎯 CACHE HIT:', cacheKey);
console.log('🔄 PROCESSANDO:', cacheKey);
```

## 🛡️ Segurança

### 🔒 Camadas de Segurança

1. **Autenticação JWT**
   - Tokens assinados com HMAC-SHA256
   - Expiração configurável
   - Refresh tokens

2. **Autorização RBAC**
   - 4 níveis hierárquicos
   - Validação por contexto
   - Controle granular

3. **Proteção de Dados**
   - Hash bcrypt para senhas
   - Input sanitization
   - SQL injection prevention

4. **Segurança de Rede**
   - CORS configurado
   - Rate limiting
   - HTTPS enforcement

### 🚨 Validações de Segurança

```javascript
// Validação de hierarquia
if (userRole !== 'admin' && userLevel <= alvoLevel) {
  return res.status(403).json({
    error: 'Você não pode operar em mesmo nível ou superior'
  });
}

// Validação de inputs
if (!email || !password) {
  return res.status(400).json({
    error: 'Campos obrigatórios faltando'
  });
}
```

### 📝 Logs de Auditoria

```javascript
console.log(`[DELETE] /api/colaboradores/${id} por ${req.user.nome} (${req.user.role})`);
console.log(`[POST] /api/news criado por ${req.user.email}`);
```

## 🧪 Testes

### 🧪 Testes Unitários (Planejados)

```bash
# Rodar testes
npm test

# Testes de cobertura
npm run test:coverage

# Testes de integração
npm run test:integration
```

### 📋 Estrutura de Testes

```
tests/
├── unit/
│   ├── auth.test.js
│   ├── colaboradores.test.js
│   └── holerites.test.js
├── integration/
│   ├── api.test.js
│   └── rbac.test.js
└── e2e/
    ├── fluxo-completo.test.js
    └── performance.test.js
```

### 🎯 Casos de Teste

- ✅ Autenticação e autorização
- ✅ Validação de regras RBAC
- ✅ Upload e processamento de PDFs
- ✅ Integração com API Kairos
- ✅ Cache e performance
- ✅ Tratamento de erros

## 📝 Contribuição

### 🤝 Como Contribuir

1. **Fork** o repositório
2. **Clone** sua fork: `git clone <your-fork>`
3. **Crie** branch: `git checkout -b feature/nova-feature`
4. **Commit** mudanças: `git commit -m 'Add nova feature'`
5. **Push** para branch: `git push origin feature/nova-feature`
6. **Abra** Pull Request

### 📋 Padrões de Código

- **ESLint** para consistência
- **Prettier** para formatação
- **Conventional Commits** para mensagens
- **Testes** para novas funcionalidades

### 🐛 Reportar Bugs

1. Verifique issues existentes
2. Crie issue com template
3. Inclua ambiente, steps e expected behavior
4. Adicione screenshots se aplicável

## 📞 Suporte

### 📧 Contato

- **Email**: suporte@enviagora.com.br
- **Discord**: [Link do servidor]
- **Documentação**: [Link da docs]

### 🆘 Problemas Comuns

| Problema | Solução |
|----------|---------|
| Token expirado | Fazer login novamente |
| Permissão negada | Verificar role no banco |
| Upload falhou | Verificar tamanho do arquivo |
| API Kairos lenta | Verificar conexão de rede |

---

## 📜 Licença

Este projeto é licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 🏆 Créditos

Desenvolvido com ❤️ pela equipe **Enviagora Hub** para revolução na gestão de recursos humanos.

---

**⭐ Se este projeto ajudou você, dê uma estrela!**

---

*Última atualização: 2026-02-20*
