require('dotenv').config();

const express = require("express");
const cors = require('cors');
const cookieParser = require("cookie-parser");

const authMiddleware = require('./middlewares/authMiddleware');
const authorizeRoles = require('./middlewares/authorizeRoles');

const loginRoutes = require('./routes/auth/login');
const sessionRoutes = require('./routes/auth/session');
const forgotPasswordRoutes = require('./routes/auth/forgotPassword');
const resetPasswordRoutes = require('./routes/auth/resetPassword');
const colaboradoresRoutes = require('./routes/colaboradores/colaboradores');
const holeritesRoutes = require('./routes/holerites/holerites');
const newsRoutes = require('./routes/news/news');
const announcementsRoutes = require('./routes/announcements/announcements');

const app = express();
const port = process.env.PORT || 3005;

// ===============================
// CORS CONFIG CORRIGIDO
// ===============================

const allowedOrigins = [
    "http://localhost:3000",
    "https://teste-n8n-frontend.le2oap.easypanel.host"
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ""));
}

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const normalizedOrigin = origin.replace(/\/$/, "");

        if (allowedOrigins.includes(normalizedOrigin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));

// ⚠️ REMOVIDO app.options('*', cors()); (quebrava no Express novo)

// ===============================
// Middlewares Globais
// ===============================

// ⚠️ IMPORTANTE: cookieParser() deve vir DEPOIS do CORS
app.use(cookieParser());

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log(`[Debug] Origin: ${req.headers.origin}`);
    console.log(`[Debug] Cookies recebidos:`, req.cookies);
    console.log(`[Debug] Headers Cookie:`, req.headers.cookie);
    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ===============================
// Rotas Públicas
// ===============================

app.use("/api/auth/login", loginRoutes);
app.use("/api/auth/forgot-password", forgotPasswordRoutes);
app.use("/api/auth/reset-password", resetPasswordRoutes);
app.use("/api/auth", sessionRoutes);

// ===============================
// Rotas Protegidas
// ===============================

app.use(
    "/api/colaboradores",
    authMiddleware,
    colaboradoresRoutes
);

app.use(
    "/api/holerites",
    authMiddleware,
    holeritesRoutes
);

app.use(
    "/api/news",
    newsRoutes
);

app.use(
    "/api/announcements",
    authMiddleware,
    announcementsRoutes
);

// ===============================
// Health Check
// ===============================

app.get('/', (req, res) => {
    res.json({ message: 'API rodando' });
});

// ===============================
// Inicialização
// ===============================

const { testarConexao } = require('./config/db');

const server = app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
    testarConexao();
});

// Timeouts maiores
server.requestTimeout = 600000;
server.headersTimeout = 610000;
server.keepAliveTimeout = 600000;

// ===============================
// Tratamento de Erros
// ===============================

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Erro: A porta ${port} já está em uso.`);
    } else {
        console.error('❌ Erro no servidor:', err);
    }
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🌐 Unhandled Rejection em:', promise, 'razão:', reason);
});

process.on('exit', (code) => {
    console.log(`✌️ Processo finalizado com código: ${code}`);
});