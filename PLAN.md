# Especificação Funcional e Arquitetural: App de Agendamento e Administração de Manicure

## 1. Visão Geral do Produto
O aplicativo é uma solução sob medida para **uma manicure/nail designer autônoma**. 
O objetivo é transformar a experiência da cliente (agendamento em menos de 1 minuto sem precisar de cadastro prévio ou baixar app de loja) e dar controle absoluto à profissional (agenda em tempo real, aviso de retorno de 15 a 21 dias, ficha técnica das clientes e caixa diário).

---

## 2. Mapa Completo de Telas e Funcionalidades

### 2.1. Módulo da Cliente (Web Pública / Mobile-First)
*Acessado via link na bio do Instagram ou WhatsApp (ex: `estudio.app/agenda`). Não exige login nem senha.*

1. **Catálogo de Procedimentos com Duração e Valor:**
   - Seleção de serviço principal (ex: *Alongamento Fibra de Vidro - R$ 160 / 120min*, *Manutenção Gel - R$ 110 / 90min*, *Cutilagem e Esmaltação - R$ 45 / 45min*).
   - Adicionais combinados opcionais (ex: *Nail Art / Francesinha + R$ 25 / +20min*, *Esmaltação em Gel nos Pés + R$ 50 / +40min*).
   - O app calcula dinamicamente o **tempo total** e o **valor total**.

2. **Seletor Inteligente de Data e Horário:**
   - Exibe calendário com dias disponíveis.
   - Lista apenas horários de início que comportem o tempo total exato do serviço + intervalo de higienização de bancada.
   - Bloqueia automaticamente qualquer horário colidente, folgas e intervalos de almoço.

3. **Identificação Simplificada:**
   - Apenas **Nome** e **WhatsApp**.
   - Campo opcional: *Observações* (alergias a esmaltes, unha roída, preferência de formato).

4. **Tela de Confirmação & Ações Imediatas:**
   - Resumo completo da reserva (Serviço, Data, Horário e Endereço).
   - **Botão "Adicionar à Agenda"**: Gera arquivo/link para Google Agenda e Apple Calendar.
   - **Botão "Avisar Manicure no WhatsApp"**: Abre o WhatsApp com texto pré-preenchido (*"Oi! Acabei de agendar Manutenção em Gel para terça 14:00 pelo app. Até lá!"*).
   - **Link de Gerenciamento**: Permite remarcar ou cancelar com 1 clique (respeitando a regra de antecedência mínima configurada).

---

### 2.2. Módulo da Manicure (Painel Administrativo / PWA)
*Acessado com autenticação segura (Firebase Auth via E-mail ou Google). Instalável como app no celular.*

1. **Dashboard / Agenda Diária e Semanal:**
   - Visualização em timeline dos atendimentos do dia.
   - Status visual: `Confirmado` 🟢, `Em Atendimento` 🟡, `Concluído` ⚪, `Cancelado` 🔴, `Faltou (No-show)` ⚠️.
   - Botão de 1 toque para chamar a cliente no WhatsApp.
   - **Encaixe Manual**: Para agendar clientes que pediram diretamente no WhatsApp.
   - **Bloqueio Rápido**: Para fechar horários imprevistos (ex: "Consulta médica 14:00 às 15:30").

2. **Finalização de Atendimento & Retorno Inteligente (O grande diferencial):**
   - Ao concluir um atendimento, a manicure escolhe a forma de pagamento (PIX, Cartão ou Dinheiro), que alimenta o caixa automaticamente.
   - **Cálculo de Retorno Automático**: O app sugere a data de retorno (15, 18 ou 21 dias). Com 1 clique, ela já reserva a manutenção ou gera a mensagem para enviar à cliente pelo WhatsApp.

3. **Ficha da Cliente (CRM de Beleza):**
   - Histórico de todos os atendimentos passados da cliente.
   - Ficha técnica: Formato favorito (amendoada, quadrada, bailarina), cores e marcas de esmalte preferidas, alergias e notas particulares.
   - **Lista de "Clientes Sumidas"**: Clientes cujo ciclo de manutenção (ex: 21 dias) já expirou há mais de 10 dias, com botão para convite amigável no WhatsApp.

4. **Gestão Financeira & Caixa Diário:**
   - Resumo do dia: total faturado discriminado por PIX, Cartão e Dinheiro.
   - Resumo do mês e registro rápido de despesas de insumos (géis, lixas, acetona, luvas, brocas).
   - Lucro líquido estimado.

5. **Configurações do Estúdio:**
   - Expediente de trabalho (dias da semana, horário inicial/final, almoço).
   - Tempo de intervalo entre atendimentos (ex: 10 minutos para esterilização de materiais).
   - Antecedência mínima para novos agendamentos (ex: no mínimo 2h antes) e para cancelamentos (ex: mínimo 12h antes).
   - Cadastro e ativação/desativação de serviços e preços.

---

## 3. Regras de Negócio e Concorrência

1. **Prevenção de Colisão de Horários:**
   - Todo agendamento ocupa um intervalo contínuo: `[inicio, inicio + duracao_servico + intervalo_limpeza]`.
   - Gravação atômica no Firestore via `runTransaction()` com validação em tempo real.
2. **Política de Cancelamento:**
   - O link de cancelamento da cliente só funciona até o limite de antecedência mínima configurado. Se o prazo expirar, o app orienta a cliente a entrar em contato diretamente via WhatsApp.
3. **Privacidade e LGPD:**
   - Apenas o telefone e nome são coletados para prestação do serviço e lembrete. Nenhuma senha ou dado sensível desnecessário é exigido da cliente.

---

## 4. Arquitetura e Stack Tecnológica (Firebase + React PWA)

Como o app é voltado para **uma única profissional**, a infraestrutura no **Google Firebase** simplifica a operação, elimina custos (enquadra-se com folga no plano gratuito Spark) e oferece sincronização em tempo real nativa.

| Camada | Tecnologia | Justificativa |
|---|---|---|
| **Frontend / App** | **React (Vite) + TypeScript** | Build estático ultrarrápido (SPA), carregamento instantâneo em conexões móveis (4G/5G). |
| **Estilização / UI** | **Tailwind CSS + shadcn/ui** | Interface moderna, responsiva, toque mobile-first e componentes prontos (calendário, modal, drawer). |
| **PWA** | `vite-plugin-pwa` | Permite instalar direto no iPhone/Android sem custos de publicação nas lojas. |
| **Backend & Banco** | **Cloud Firestore (NoSQL)** | Leituras em tempo real (`onSnapshot`) para a agenda atualizar na hora; suporte a transações atômicas para evitar reservas duplicadas. |
| **Autenticação** | **Firebase Auth** | Login seguro para a manicure (Google ou E-mail/Senha). Clientes agendam sem necessidade de criar conta prévia (informam Nome e WhatsApp). |
| **Hospedagem** | **Firebase Hosting** | CDN global ultraveloz do Google, SSL gratuito automático, deploy com 1 comando (`firebase deploy`). |
| **Armazenamento** | **Firebase Storage** | Fotos de antes/depois e referências de nail art no perfil da cliente. |

---

## 5. Modelagem de Coleções no Cloud Firestore

Como o escopo é individual (uma única manicure), a estrutura NoSQL é limpa e direta:

1. **`settings`** (Configurações da Manicure)
   * `docId: "business"`
   * `ownerName`, `phone`, `bio`, `workHours` (ex: `{"seg": {"start": "08:00", "end": "18:00", "lunchStart": "12:00", "lunchEnd": "13:00"}}`), `maintenanceDaysAlert` (default: 20 dias).

2. **`services`** (Catálogo de Procedimentos)
   * `docId: autoId`
   * `title` (ex: "Manutenção Gel", "Esmaltação Simples"), `price` (number), `durationMinutes` (number), `active` (boolean).

3. **`appointments`** (Agendamentos)
   * `docId: deterministicSlotId` (ex: `slot_2026-12-05_09-00`) ou autoId garantido via `runTransaction`.
   * `clientName`, `clientPhone`, `serviceId`, `serviceTitle`, `startAt` (timestamp), `endAt` (timestamp), `status` ("confirmed" | "completed" | "cancelled"), `notes`.

4. **`clients`** (Ficha e Histórico)
   * `docId: normalizedPhone` (chave única pelo telefone)
   * `name`, `phone`, `allergies`, `favoriteColors`, `lastAppointmentDate`, `totalVisits`.

5. **`transactions`** (Caixa e Comandas)
   * `docId: autoId`
   * `appointmentId`, `date`, `amount`, `paymentMethod` ("pix" | "cartao" | "dinheiro"), `type` ("income" | "expense"), `description`.

---

## 6. Prevenção de Concorrência (Double Booking no Firestore)
Para garantir que duas clientes não marquem o mesmo horário simultaneamente:
1. **Transações Atômicas (`runTransaction`):** Ao confirmar o agendamento, o código lê os horários ocupados no dia e só grava se não houver intersecção com a duração do serviço escolhido.
2. **Security Rules do Firestore:** Regras estritas impedem que documentos de agendamento existentes sejam sobrescritos diretamente pelo cliente (`allow create: if !exists(...)`).

---

## 7. Roteiro de Implementação (Roadmap em Fases)

### Fase 1: MVP Enxuto (Core do Negócio)
- [ ] Setup do projeto (React + Vite + TypeScript + Tailwind CSS + shadcn/ui).
- [ ] Configuração do Firebase SDK (Firestore, Auth, Hosting).
- [ ] Cadastro e gestão de Serviços (preço e duração).
- [ ] Configuração dos horários de expediente e bloqueios da manicure.
- [ ] Fluxo de agendamento público para clientes (com validação de colisão de horários no Firestore).
- [ ] Painel da manicure com atualização em tempo real (`onSnapshot`) para visualização diária/semanal e confirmação/cancelamento.

### Fase 2: Experiência & Redução de No-Show
- [ ] Mensagens de confirmação e lembrete formatadas para WhatsApp (`wa.me`).
- [ ] Ficha da cliente e histórico de atendimentos com base no WhatsApp.
- [ ] Notificação visual de retorno programado (15-21 dias para manutenção de alongamento).
- [ ] PWA instalado (`vite-plugin-pwa`) com suporte a ícone na tela inicial e abertura standalone.

### Fase 3: Gestão Financeira & Portfólio
- [ ] Registro de recebimento de comanda e método de pagamento (PIX, Dinheiro, Cartão).
- [ ] Upload de fotos de unhas (antes/depois) associadas ao atendimento via Firebase Storage.
- [ ] Relatório básico de faturamento diário, semanal e mensal.
- [ ] Controle básico de despesas e compras de insumos.
