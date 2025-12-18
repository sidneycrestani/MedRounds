# MedRounds 🩺

> **Simulador de Raciocínio Clínico & Diagnóstico de Competência.**

O **MedRounds** é uma plataforma de *Open-Ended Question Bank* (QBank) projetada para estudantes de medicina e residentes. Diferente de bancos de múltipla escolha tradicionais, o MedRounds utiliza IA Generativa para avaliar respostas discursivas, forçando o **Active Recall** (recuperação ativa) em vez do reconhecimento passivo.

A plataforma não substitui o Anki; ela atua como o **ambiente de teste**. O fluxo é desenhado para expor lacunas de conhecimento (diagnóstico), permitir a análise do erro e agendar retestes estratégicos.

---

## ⚡ Filosofia & Fluxo de Estudo

O sistema implementa um ciclo de aprendizado focado na **metacognição** e intervenção manual:

1. **Exposição (Vignette):** O usuário enfrenta casos clínicos reais e deve digitar sua conduta ou diagnóstico. Não há opções para "chutar".
2. **Correção via IA (Preceptor Mode):** O *Google Gemini 2.5 Flash* analisa a resposta semântica, comparando com o gabarito oficial e keywords obrigatórias. Ele atua como um preceptor sênior: rigoroso e direto.
3. **Review Inbox (Triagem de Erros):** Erros não somem. Eles entram em uma "Caixa de Entrada" de revisão.
4. **Consolidação Ativa (A Diferença):**
* Na etapa de revisão, o aluno estuda o gabarito.
* **Criação Manual:** O aluno é incentivado a criar *seus próprios* flashcards no Anki baseados na falha específica de raciocínio que teve. Acreditamos que a *criação* do material é parte vital da codificação da memória.


5. **Snooze Estratégico (SRS Intervencionista):**
* Após estudar o erro, o aluno define quando quer ser testado novamente na plataforma:
* 📅 **10 Dias (Curto Prazo):** Para erros de conceito ou memória recente.
* 📅 **45 Dias (Longo Prazo):** Para validar a retenção e garantir que o acerto não foi sorte.



---

## 🛠️ Arquitetura & Tech Stack

O projeto é um monorepo focado em performance, tipagem estrita e execução na Edge.

### Core

* **Framework:** [Astro 5.0](https://astro.build/) (Híbrido: SSG para conteúdo estático, SSR para áreas logadas).
* **Linguagem:** TypeScript (Strict Mode).
* **State/UI:** React 18, Tailwind CSS, Shadcn/UI.

### Backend & Data

* **Database:** PostgreSQL (via Supabase).
* **ORM:** Drizzle ORM (Type-safe SQL).
* **API:** Astro API Routes + Supabase Edge Functions (para proteção de chaves de API e lógica de IA).
* **AI Engine:** Google Gemini API (`gemini-2.5-flash`) com prompt engineering otimizado para JSON output.

### Infraestrutura

* **Deployment:** Cloudflare Pages (Adapter).
* **Auth:** Supabase Auth (SSR flow com Cookies).

---

## 📂 Estrutura do Projeto

A organização segue uma estrutura modular para facilitar a escalabilidade:

```text
/
├── src/
│   ├── core/            # Configurações globais (DB connection, Env validation)
│   ├── modules/         # Domain-Driven Design (Lógica de negócio isolada)
│   │   ├── cases/       # Repositórios e componentes de Casos Clínicos
│   │   ├── srs/         # Lógica de Agendamento e Histórico
│   │   └── taxonomy/    # Gestão de Tags e Árvore de Tópicos
│   ├── pages/           # File-based routing do Astro (API & UI)
│   └── components/      # UI Kit compartilhado (Atomic Design)
├── drizzle/             # Migrations SQL e Snapshots
├── supabase/            # Edge Functions (Lógica Server-side segura)
└── scripts/             # Tooling (Linting de conteúdo, Seeding de dados)

```

---

## 🚀 Instalação e Setup

### Pré-requisitos

* Node.js 20+
* Instância Supabase (PostgreSQL)
* Google AI Studio API Key

### 1. Clonar e Instalar

```bash
git clone https://github.com/seu-usuario/medrounds.git
cd medrounds
npm install

```

### 2. Configuração de Ambiente

Crie um arquivo `.env` na raiz com as credenciais do Supabase:

```env
# Database (Use o Transaction Pooler para serverless)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Supabase Auth
PUBLIC_SUPABASE_URL="https://[PROJECT-ID].supabase.co"
PUBLIC_SUPABASE_ANON_KEY="[SUA-ANON-KEY]"

```

*Nota: A `GEMINI_API_KEY` deve ser configurada nas Environment Variables da Edge Function (Supabase), garantindo que nunca seja exposta no cliente.*

### 3. Banco de Dados

Inicialize o schema e popule com dados de exemplo:

```bash
# Aplica as migrações do Drizzle
npm run drizzle:migrate

# Executa o seed (Taxonomia + Casos iniciais)
npm run seed

```

### 4. Executar

```bash
npm run dev

```

O ambiente estará disponível em `http://localhost:4321`.

---

## 🧠 Detalhes do Algoritmo de Agendamento

A lógica de "Snooze" reside em `src/core/srs/scheduler.ts`. Diferente de algoritmos opacos (como SM-2 ou FSRS), o MedRounds dá o controle ao usuário:

* **Learning Phase:** Se `score < 100`, o item entra em estado de revisão (`next_review_at = null`).
* **Short Term:** Adiciona `+10 dias` à data atual.
* **Long Term:** Adiciona `+45 dias` à data atual.
* **Mastered:** Marca como dominado e remove da fila de revisão até reset manual.

---

## 🤝 Contribuição

O projeto segue padrões estritos de **Linting** e **Type Checking**.

1. Crie sua feature branch (`git checkout -b feature/AmazingFeature`).
2. Garanta que o código passa no Biome (`npm run lint`).
3. Commit suas mudanças.
4. Push para a branch e abra um Pull Request.

---

## 📝 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.