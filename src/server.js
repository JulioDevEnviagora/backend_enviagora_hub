require('dotenv').config();

const express = require("express");
const cors = require('cors');
const cookieParser = require("cookie-parser");

const authMiddleware = require('./middlewares/authMiddleware');
const { authorizeRoles, authorizeDelete } = require('./middlewares/authorizeRoles');

const loginRoutes = require('./routes/auth/login');
const sessionRoutes = require('./routes/auth/session');
const forgotPasswordRoutes = require('./routes/auth/forgotPassword');
const resetPasswordRoutes = require('./routes/auth/resetPassword');
const colaboradoresRoutes = require('./routes/colaboradores/colaboradores');
const holeritesRoutes = require('./routes/holerites/holerites');
const newsRoutes = require('./routes/news/news');
const announcementsRoutes = require('./routes/announcements/announcements');

const { testarConexao } = require('./config/db');

const app = express();
const port = process.env.PORT || 3005;

/* ===============================
   CORS CONFIG SEGURO
=============================== */

const allowedOrigins = [
    "http://localhost:3000",
    "https://teste-n8n-frontend.le2oap.easypanel.host"
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ""));
}

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        const normalizedOrigin = origin.replace(/\/$/, "");

        if (allowedOrigins.includes(normalizedOrigin)) {
            callback(null, true);
        } else {
            console.warn("❌ CORS bloqueado:", origin);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
}));

/* ===============================
   Middlewares Globais
=============================== */

app.use(cookieParser());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 🔒 REMOVIDO LOG DE COOKIES EM PRODUÇÃO
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
    });
}

/* ===============================
   Rotas Públicas
=============================== */

app.use("/api/auth/login", loginRoutes);
app.use("/api/auth/forgot-password", forgotPasswordRoutes);
app.use("/api/auth/reset-password", resetPasswordRoutes);
app.use("/api/auth", sessionRoutes);

/* ===============================
   Rotas Protegidas - Hierarquia: admin > rh > assistente > funcionario
=============================== */

// 🔒 Assistente, RH e Admin podem listar colaboradores
app.use(
    "/api/colaboradores",
    authMiddleware,
    authorizeRoles('funcionario'), // Qualquer role acima de funcionário
    colaboradoresRoutes
);

// 🔒 RH, Assistente e Admin podem acessar holerites
app.use(
    "/api/holerites",
    authMiddleware,
    authorizeRoles('funcionario'), // Qualquer role acima de funcionário
    holeritesRoutes
);

// 🔒 Todos autenticados podem acessar news
app.use(
    "/api/news",
    authMiddleware,
    newsRoutes
);

// 🔒 Todos autenticados podem acessar announcements
app.use(
    "/api/announcements",
    authMiddleware,
    announcementsRoutes
);

// 🔒 Todos autenticados podem acessar horas extras
app.use(
    "/api/controle-ponto",
    authMiddleware,
    require('./routes/controle_ponto/controle_ponto')
);

/* ===============================
   Health Check
=============================== */

app.get('/', (req, res) => {
    res.json({ message: 'API rodando' });
});

/* ===============================
   Inicialização
=============================== */

const server = app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
    testarConexao();
});

server.requestTimeout = 600000;
server.headersTimeout = 610000;
server.keepAliveTimeout = 600000;

/* ===============================
   Error Handler Global
=============================== */

app.use((err, req, res, next) => {
    console.error("🔥 Erro global:", err.message);
    res.status(500).json({
        error: "Erro interno do servidor"
    });
});

/* ===============================
   Process Handlers
=============================== */

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Porta ${port} já está em uso.`);
    } else {
        console.error('❌ Erro no servidor:', err);
    }
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('🌐 Unhandled Rejection:', reason);
});
