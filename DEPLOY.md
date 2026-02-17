# 🚀 Configuração para Deploy em VPS

## ⚠️ IMPORTANTE: Configuração de Cookies para HTTPS

O backend agora está configurado para funcionar corretamente com HTTPS em produção.

### Variáveis de Ambiente Necessárias na VPS

Certifique-se de que o arquivo `.env` na VPS contenha:

```env
NODE_ENV=production
FRONTEND_URL=https://teste-n8n-frontend.le2oap.easypanel.host
```

### Por que isso é necessário?

Quando o frontend usa HTTPS e o backend também, os cookies precisam ter:
- `secure: true` - Cookie só é enviado via HTTPS
- `sameSite: 'none'` - Permite cookies cross-origin (frontend e backend em domínios diferentes)

### Checklist de Deploy

1. ✅ Adicionar `NODE_ENV=production` no `.env` da VPS
2. ✅ Adicionar `FRONTEND_URL` correto no `.env` da VPS
3. ✅ Reiniciar o servidor backend na VPS
4. ✅ Verificar se o backend está rodando em HTTPS (ou atrás de um proxy reverso com HTTPS)

### Testando

Após o deploy, teste o login e verifique:
- O cookie `token` deve aparecer nas DevTools do navegador
- O cookie deve ter `Secure` e `SameSite=None` em produção
- A rota `/api/auth/me` deve retornar os dados do usuário

### Desenvolvimento Local

Em desenvolvimento (sem `NODE_ENV=production`), os cookies usam:
- `secure: false` - Funciona com HTTP
- `sameSite: 'lax'` - Mais permissivo para desenvolvimento local
