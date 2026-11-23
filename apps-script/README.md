# 💅 Automação Gratuita de Lembretes WhatsApp — Espaço Val Brombini

Esta pasta contém o script para rodar nos servidores gratuitos da Google (**Google Apps Script**) e disparar lembretes automáticos de agendamento no WhatsApp de clientes com horário marcado para o dia seguinte ($D-1$).

---

## 🚀 Como Funciona

1. **Sem custos**: O script roda na infraestrutura gratuita do Google Cloud / Google Drive.
2. **Sem computador ligado**: O robô roda na nuvem todo dia no horário configurado (ex: 18:00).
3. **Sem duplicação**: Ele consulta os agendamentos no Firestore do Firebase, envia o lembrete e marca `reminderSent: true` no banco.
4. **Oficial e Seguro**: Utiliza a **WhatsApp Cloud API** oficial da Meta (zero risco de banimento de chip).

---

## 📋 Passo a Passo de Configuração

### Passo 1: Criar o Projeto no Google Apps Script
1. Acesse: [script.google.com](https://script.google.com/).
2. Clique em **Novo projeto** (canto superior esquerdo).
3. Dê o nome ao projeto de: `Lembretes WhatsApp - Val Brombini`.
4. Apague qualquer código existente no editor e cole o conteúdo completo do arquivo [`LembretesWhatsApp.js`](./LembretesWhatsApp.js).

---

### Passo 2: Obter as Credenciais Gratuitas da Meta (WhatsApp)
1. Acesse o portal de desenvolvedores da Meta: [developers.facebook.com](https://developers.facebook.com/).
2. Faça login com sua conta do Facebook.
3. Clique em **Meus Aplicativos** > **Criar Aplicativo**.
4. Selecione o tipo de aplicativo **Outro** > **Empresa**.
5. No painel de produtos, adicione o **WhatsApp**.
6. No menu lateral do WhatsApp, clique em **Início da API (API Setup)**:
   - Você verá o **Identificador do número de telefone (Phone Number ID)**.
   - Você verá um **Token de Acesso temporário** (para testes imediatos).
7. Copie esses dois valores e cole nas variáveis do arquivo `LembretesWhatsApp.js`:
   ```javascript
   META_PHONE_NUMBER_ID: "SEU_PHONE_NUMBER_ID_AQUI",
   META_ACCESS_TOKEN: "SEU_ACCESS_TOKEN_AQUI",
   ```

---

### Passo 3: Testar o Envio Manual
1. No topo do editor do Google Apps Script, no seletor de funções, escolha a função `testarEnvioManual`.
2. Altere o número da variável `seuTelefoneComDDD` dentro da função para o seu próprio número de WhatsApp com DDD.
3. Clique no botão **Executar**.
4. Na primeira vez, o Google pedirá autorização para o script fazer requisições externas (`UrlFetchApp`). Clique em **Revisar permissões**, selecione sua conta e autorize.
5. Verifique o seu WhatsApp: você receberá a mensagem de teste em instantes!

---

### Passo 4: Ativar o Disparo Automático Diário (Acionador)
1. No menu lateral esquerdo do Google Apps Script, clique no ícone de relógio (**Acionadores / Triggers**).
2. Clique no botão azul **Adicionar acionador** (canto inferior direito).
3. Configure da seguinte forma:
   - **Escolha a função a ser executada:** `dispararLembretesDeAmanha`
   - **Origem do evento:** `Baseado no tempo`
   - **Tipo de acionador:** `Temporizador por dia`
   - **Hora do dia:** `18:00 às 19:00` (ou o horário que preferir no fim do expediente)
4. Clique em **Salvar**.

---

## 🎯 Pronto!
A partir de agora, todos os dias no horário programado, o Google:
- Consultará sua agenda no Firebase;
- Identificará as clientes de amanhã;
- Disparará as mensagens no WhatsApp com texto personalizado e endereço;
- Atualizará o sistema com o status de lembrete enviado.
