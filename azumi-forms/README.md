# Azumi Forms 📋

Form Builder interno da Azumi RH — crie formulários personalizados, gere links por cliente, receba respostas no Supabase e notificações via Resend.

---

## 🚀 Como fazer o deploy

### 1. Banco de dados (Supabase)

1. Acesse [supabase.com](https://supabase.com) e abra seu projeto
2. Vá em **SQL Editor → New Query**
3. Cole o conteúdo do arquivo `supabase-setup.sql` e clique em **Run**

### 2. Suba o código no GitHub

```bash
git init
git add .
git commit -m "Azumi Forms - primeiro deploy"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/azumi-forms.git
git push -u origin main
```

### 3. Deploy na Vercel

1. Acesse [vercel.com](https://vercel.com) → **New Project**
2. Importe o repositório do GitHub
3. Em **Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://lliqhfuwljcmqfkflmrh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sua chave anon do Supabase |
| `RESEND_API_KEY` | sua chave da API do Resend |
| `ADMIN_PASSWORD` | senha para acessar o painel admin |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | mesma senha acima |
| `NOTIFY_EMAIL` | `contato@azumirh.com.br` |

4. Clique em **Deploy** ✅

---

## 🔑 Acesso

- **Admin (você):** `seudominio.vercel.app/` → senha configurada acima
- **Cliente:** `seudominio.vercel.app/forms/ID_DO_FORMULARIO`

---

## 📊 Ver respostas

**No painel admin:**
- Clique em **Respostas** → vê tudo na tela
- Clique em **CSV** → baixa o arquivo → arraste pro Google Sheets

**No Supabase (tipo Excel):**
- Acesse Supabase → **Table Editor** → tabela `responses`
- Vê todas as respostas com filtros e busca

---

## 📧 E-mail (Resend)

Para enviar e-mails com seu domínio (`@azumirh.com.br`), configure o domínio no Resend e altere o `from` em `pages/api/submit.ts`:

```ts
from: 'Azumi Forms <forms@azumirh.com.br>',
```

---

## 🔄 Atualizar o sistema

Qualquer mudança no código → `git push` → Vercel faz deploy automático em ~30 segundos.

---

**AZUMI RH** · contato@azumirh.com.br · azumirh.com.br · +55 41 98835-0743
