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
const app = express();
const port = process.env.PORT || 3005;

// ===============================
// Middlewares Globais
// ===============================

app.use(cookieParser());

app.use(
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    })
);

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
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

const server = app.listen(port, () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
    testarConexao();
});

// Aumenta os timeouts para lidar com uploads grandes e processamento de PDF demorado
server.requestTimeout = 600000; // 10 minutos
server.headersTimeout = 610000; // Um pouco mais que o requestTimeout
server.keepAliveTimeout = 600000;

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Erro: A porta ${port} já está em uso.`);
    } else {
        console.error('❌ Erro no servidor:', err);
    }
    process.exit(1);
});

// Captura erros globais para evitar que o servidor caia sem aviso
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🌐 Unhandled Rejection em:', promise, 'razão:', reason);
});

process.on('exit', (code) => {
    console.log(`✌️ Processo finalizado com código: ${code}`);
});