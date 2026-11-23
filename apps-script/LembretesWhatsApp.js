/**
 * ============================================================================
 * ESPAÇO VAL BROMBINI - AUTOMAÇÃO DE LEMBRETES DE AGENDAMENTO (WHATSAPP)
 * ============================================================================
 * 
 * Este script roda nos servidores gratuitos do Google (Google Apps Script).
 * Ele é acionado automaticamente todos os dias às 18:00 (ou horário de sua escolha).
 * 
 * O que ele faz:
 * 1. Calcula a data do dia seguinte (D+1).
 * 2. Consulta o banco Firestore do Firebase e busca os agendamentos confirmados.
 * 3. Monta uma mensagem amigável e personalizada com nome, horário, procedimento e endereço.
 * 4. Dispara a mensagem no WhatsApp da cliente via Meta WhatsApp Cloud API (Oficial e Gratuita).
 * 5. Marca no Firebase que o lembrete foi enviado (evitando duplicações).
 */

// ============================================================================
// CONFIGURAÇÕES GERAIS (Preencha nas 'Propriedades do Script' ou abaixo)
// ============================================================================
const CONFIG = {
  // ID do seu projeto no Firebase (já configurado para o estúdio)
  FIREBASE_PROJECT_ID: "studio-nails-josafa",
  
  // Dados do seu Estúdio
  STUDIO_NAME: "Espaço Val Brombini",
  OWNER_NAME: "Valquiria Brombini",
  STUDIO_ADDRESS: "Rua das Flores, 123 - Centro",
  
  // Configurações da Meta WhatsApp Cloud API
  // (Obtidas gratuitamente em developers.facebook.com > WhatsApp > API Setup)
  META_PHONE_NUMBER_ID: "1489500727573945",
  META_ACCESS_TOKEN: "EAAQFP4YDatEBTEvM93rrpoIgI5dafYROXl5girfk5c7GKCpSKyclvyeW71cMvcZCca1JNkLaaIC5ZAHoLDLNrs5hanRvicWOThZBDQpQRoSccrs9DIMING99CTiMAcSZAAqh2rzvm2rohNGNA400wrp9wdU1OF8hD40YZAQgpHGsAbCEkVfQmR3XZBrq0I0oqxoYJhZBmaLUxltGBhhPS6ZCPkzTwJ169xZAUJ6SbjYkuZAfvEz0gpkisUTLucgNYZBI2Kc91IN3wc45cP1uUyYVcpsMKmZAMZAkZD",
  
  // Fuso horário
  TIMEZONE: "America/Sao_Paulo"
};

/**
 * ============================================================================
 * 1. FUNÇÃO PRINCIPAL: DISPARAR LEMBRETES DE AMANHÃ
 * ============================================================================
 * Configure esta função no 'Relógio de Acionadores' (Triggers) para rodar
 * diariamente entre 18:00 e 19:00.
 */
function dispararLembretesDeAmanha() {
  const agora = new Date();
  
  // Calcula o dia de amanhã
  const amanha = new Date(agora);
  amanha.setDate(agora.getDate() + 1);
  const dataAmanhaStr = Utilities.formatDate(amanha, CONFIG.TIMEZONE, "yyyy-MM-dd");
  const dataAmanhaFormatada = Utilities.formatDate(amanha, CONFIG.TIMEZONE, "dd/MM/yyyy");

  Logger.log(">>> [Início] Buscando agendamentos para a data: " + dataAmanhaStr);

  const agendamentos = buscarAgendamentosDoFirestore(dataAmanhaStr);
  Logger.log(`>>> Encontrados ${agendamentos.length} agendamentos para amanhã.`);

  let totalEnviados = 0;
  let totalIgnorados = 0;
  let totalErros = 0;

  for (const item of agendamentos) {
    const { id, docPath, clientName, clientPhone, startTime, serviceTitle, status, reminderSent } = item;

    // Apenas agendamentos confirmados que ainda não receberam lembrete
    if (status !== "confirmed") {
      Logger.log(`- Ignorado: ${clientName} (Status: ${status})`);
      totalIgnorados++;
      continue;
    }

    if (reminderSent) {
      Logger.log(`- Ignorado: ${clientName} (Lembrete já havia sido enviado anteriormente).`);
      totalIgnorados++;
      continue;
    }

    const telefoneLimpo = String(clientPhone || "").replace(/\D/g, "");
    if (telefoneLimpo.length < 10) {
      Logger.log(`- Erro: Telefone inválido para ${clientName}: ${clientPhone}`);
      totalErros++;
      continue;
    }

    // Mensagem cordial e humanizada
    const mensagemTexto = 
      `Olá, ${clientName}! 💅 Tudo bem?\n\n` +
      `Passando para lembrar do seu horário amanhã (*${dataAmanhaFormatada}*) às *${startTime}* no *${CONFIG.STUDIO_NAME}*.\n\n` +
      `🌸 *Procedimento:* ${serviceTitle}\n` +
      `📍 *Endereço:* ${CONFIG.STUDIO_ADDRESS}\n\n` +
      `Poderia confirmar sua presença respondendo com um *Sim* por favor? Te esperamos com carinho! 😊`;

    Logger.log(`>>> Enviando mensagem para ${clientName} (${telefoneLimpo})...`);

    const envioSucesso = enviarMensagemWhatsAppMeta(telefoneLimpo, mensagemTexto);

    if (envioSucesso) {
      marcarLembreteEnviadoNoFirestore(docPath);
      totalEnviados++;
      Logger.log(`✓ Lembrete enviado com sucesso para ${clientName}!`);
    } else {
      totalErros++;
      Logger.log(`✕ Falha ao enviar para ${clientName}.`);
    }

    // Intervalo de segurança de 1.5 segundo entre envios
    Utilities.sleep(1500);
  }

  Logger.log(`>>> [Fim] Resumo: ${totalEnviados} enviados, ${totalIgnorados} ignorados, ${totalErros} erros.`);
}

/**
 * ============================================================================
 * 2. CONSULTAR AGENDAMENTOS NO FIRESTORE (REST API)
 * ============================================================================
 */
function buscarAgendamentosDoFirestore(dataFiltro) {
  // A coleção 'appointments' é pública para leitura no firestore.rules
  const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.FIREBASE_PROJECT_ID}/databases/(default)/documents/appointments`;
  
  try {
    const res = UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true
    });

    if (res.getResponseCode() !== 200) {
      Logger.log("Erro ao consultar Firestore: " + res.getContentText());
      return [];
    }

    const json = JSON.parse(res.getContentText());
    if (!json.documents || !Array.isArray(json.documents)) {
      return [];
    }

    const lista = [];

    for (const doc of json.documents) {
      const f = doc.fields || {};
      const date = f.date ? f.date.stringValue : "";

      if (date === dataFiltro) {
        lista.push({
          id: doc.name.split("/").pop(),
          docPath: doc.name,
          clientName: f.clientName ? f.clientName.stringValue : "Cliente",
          clientPhone: f.clientPhone ? f.clientPhone.stringValue : "",
          startTime: f.startTime ? f.startTime.stringValue : "00:00",
          serviceTitle: f.serviceTitle ? f.serviceTitle.stringValue : "Atendimento",
          status: f.status ? f.status.stringValue : "pending",
          reminderSent: f.reminderSent ? f.reminderSent.booleanValue : false
        });
      }
    }

    return lista;
  } catch (e) {
    Logger.log("Exceção ao buscar do Firestore: " + e.message);
    return [];
  }
}

/**
 * ============================================================================
 * 3. DISPARAR MENSAGEM VIA META WHATSAPP CLOUD API (OFICIAL)
 * ============================================================================
 */
function enviarMensagemWhatsAppMeta(telefoneComDDD, texto) {
  // Se ainda estiver com credenciais padrão em teste, apenas simula
  if (CONFIG.META_PHONE_NUMBER_ID === "SEU_PHONE_NUMBER_ID_DA_META") {
    Logger.log("[SIMULAÇÃO] Token da Meta não configurado. Mensagem simulada com sucesso para: " + telefoneComDDD);
    Logger.log("[Texto Simulador]: " + texto);
    return true; // Retorna true para permitir testes de fluxo
  }

  const url = `https://graph.facebook.com/v19.0/${CONFIG.META_PHONE_NUMBER_ID}/messages`;
  
  // Garante DDI 55 do Brasil
  let numeroDestino = telefoneComDDD;
  if (!numeroDestino.startsWith("55")) {
    numeroDestino = "55" + numeroDestino;
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: numeroDestino,
    type: "text",
    text: {
      preview_url: false,
      body: texto
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": "Bearer " + CONFIG.META_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const res = UrlFetchApp.fetch(url, options);
    const code = res.getResponseCode();
    if (code === 200 || code === 201) {
      return true;
    } else {
      Logger.log(`Erro Meta API (${code}): ` + res.getContentText());
      return false;
    }
  } catch (err) {
    Logger.log("Exceção ao disparar Meta API: " + err.message);
    return false;
  }
}

/**
 * ============================================================================
 * 4. ATUALIZAR STATUS NO FIRESTORE (reminderSent = true)
 * ============================================================================
 */
function marcarLembreteEnviadoNoFirestore(docFullName) {
  const updateUrl = `https://firestore.googleapis.com/v1/${docFullName}?updateMask.fieldPaths=reminderSent&updateMask.fieldPaths=reminderSentAt`;
  
  const payload = {
    fields: {
      reminderSent: { booleanValue: true },
      reminderSentAt: { stringValue: new Date().toISOString() }
    }
  };

  try {
    UrlFetchApp.fetch(updateUrl, {
      method: "patch",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log("Aviso ao atualizar reminderSent no Firestore: " + e.message);
  }
}

/**
 * ============================================================================
 * 5. FUNÇÃO DE TESTE MANUAL
 * ============================================================================
 * Execute esta função diretamente pelo botão 'Executar' do Apps Script
 * para testar o envio com o seu próprio WhatsApp!
 */
function testarEnvioManual() {
  const seuTelefoneComDDD = "11982187682"; // Telefone de teste do usuário
  const mensagemTeste = 
    `💅 *[TESTE] Espaço Val Brombini*\n` +
    `Este é um disparo de teste da automação gratuita do Google Apps Script com WhatsApp!\n` +
    `Data do teste: ${new Date().toLocaleString("pt-BR")}`;

  Logger.log("Enviando teste para: " + seuTelefoneComDDD);
  const ok = enviarMensagemWhatsAppMeta(seuTelefoneComDDD, mensagemTeste);
  Logger.log("Resultado do teste: " + (ok ? "SUCESSO" : "FALHA"));
}
