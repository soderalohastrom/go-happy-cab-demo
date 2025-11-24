import { mutation } from "./_generated/server";

/**
 * Seed SMS Templates
 * Creates initial template library for SMS Switchboard
 * Created: November 24, 2025
 *
 * Run with: npx convex run seedSmsTemplates:seed
 */

// Template definitions with bilingual support
const INITIAL_TEMPLATES = [
  // ============================================================================
  // PICKUP TEMPLATES
  // ============================================================================
  {
    name: "Pickup Complete",
    category: "pickup",
    targetRecipientType: "parent",
    language: "en",
    messageText:
      "Go Happy Cab: {{child_name}} has been picked up by {{driver_name}} at {{time}}. Safe travels! 🚗",
    variables: [
      { key: "child_name", label: "Child Name", required: true },
      { key: "driver_name", label: "Driver Name", required: true },
      { key: "time", label: "Pickup Time", required: true },
    ],
  },
  {
    name: "Busca Concluída",
    category: "pickup",
    targetRecipientType: "parent",
    language: "pt-BR",
    messageText:
      "Go Happy Cab: {{child_name}} foi buscado(a) por {{driver_name}} às {{time}}. Boa viagem! 🚗",
    variables: [
      { key: "child_name", label: "Nome da Criança", required: true },
      { key: "driver_name", label: "Nome do Motorista", required: true },
      { key: "time", label: "Hora da Busca", required: true },
    ],
  },

  // ============================================================================
  // NO-SHOW TEMPLATES
  // ============================================================================
  {
    name: "No-Show Notification",
    category: "pickup",
    targetRecipientType: "parent",
    language: "en",
    messageText:
      "Go Happy Cab: Driver {{driver_name}} arrived for {{child_name}} but was unable to complete pickup. Please contact dispatch if you have questions.",
    variables: [
      { key: "driver_name", label: "Driver Name", required: true },
      { key: "child_name", label: "Child Name", required: true },
    ],
  },
  {
    name: "Notificação de Não Comparecimento",
    category: "pickup",
    targetRecipientType: "parent",
    language: "pt-BR",
    messageText:
      "Go Happy Cab: O motorista {{driver_name}} chegou para buscar {{child_name}} mas não conseguiu completar a busca. Por favor, entre em contato com o dispatch se tiver dúvidas.",
    variables: [
      { key: "driver_name", label: "Nome do Motorista", required: true },
      { key: "child_name", label: "Nome da Criança", required: true },
    ],
  },

  // ============================================================================
  // ROUTE ASSIGNED TEMPLATES
  // ============================================================================
  {
    name: "Route Assigned",
    category: "schedule",
    targetRecipientType: "parent",
    language: "en",
    messageText:
      "Go Happy Cab: {{child_name}}'s route has been scheduled for {{date}} at {{time}}. Driver: {{driver_name}}. Reply STOP to opt out.",
    variables: [
      { key: "child_name", label: "Child Name", required: true },
      { key: "date", label: "Date", required: true },
      { key: "time", label: "Time", required: true },
      { key: "driver_name", label: "Driver Name", required: true },
    ],
  },
  {
    name: "Rota Agendada",
    category: "schedule",
    targetRecipientType: "parent",
    language: "pt-BR",
    messageText:
      "Go Happy Cab: A rota de {{child_name}} foi agendada para {{date}} às {{time}}. Motorista: {{driver_name}}. Responda PARAR para cancelar.",
    variables: [
      { key: "child_name", label: "Nome da Criança", required: true },
      { key: "date", label: "Data", required: true },
      { key: "time", label: "Hora", required: true },
      { key: "driver_name", label: "Nome do Motorista", required: true },
    ],
  },

  // ============================================================================
  // DELAY TEMPLATES
  // ============================================================================
  {
    name: "Delay Notification",
    category: "delay",
    targetRecipientType: "parent",
    language: "en",
    messageText:
      "Go Happy Cab: {{child_name}}'s pickup is delayed by approximately {{delay_minutes}} minutes. New estimated time: {{new_time}}. We apologize for the inconvenience.",
    variables: [
      { key: "child_name", label: "Child Name", required: true },
      { key: "delay_minutes", label: "Delay (minutes)", required: true },
      { key: "new_time", label: "New ETA", required: true },
    ],
  },
  {
    name: "Notificação de Atraso",
    category: "delay",
    targetRecipientType: "parent",
    language: "pt-BR",
    messageText:
      "Go Happy Cab: A busca de {{child_name}} está atrasada em aproximadamente {{delay_minutes}} minutos. Nova previsão: {{new_time}}. Pedimos desculpas pelo inconveniente.",
    variables: [
      { key: "child_name", label: "Nome da Criança", required: true },
      { key: "delay_minutes", label: "Atraso (minutos)", required: true },
      { key: "new_time", label: "Nova Previsão", required: true },
    ],
  },

  // ============================================================================
  // EMERGENCY TEMPLATES
  // ============================================================================
  {
    name: "Emergency Alert",
    category: "emergency",
    targetRecipientType: "any",
    language: "en",
    messageText:
      "🚨 URGENT - Go Happy Cab: {{message}}. Please respond immediately or call dispatch at {{dispatch_phone}}.",
    variables: [
      { key: "message", label: "Emergency Message", required: true },
      { key: "dispatch_phone", label: "Dispatch Phone", required: true, defaultValue: "415-800-2273" },
    ],
  },
  {
    name: "Alerta de Emergência",
    category: "emergency",
    targetRecipientType: "any",
    language: "pt-BR",
    messageText:
      "🚨 URGENTE - Go Happy Cab: {{message}}. Por favor, responda imediatamente ou ligue para o dispatch: {{dispatch_phone}}.",
    variables: [
      { key: "message", label: "Mensagem de Emergência", required: true },
      { key: "dispatch_phone", label: "Telefone do Dispatch", required: true, defaultValue: "415-800-2273" },
    ],
  },

  // ============================================================================
  // DROPOFF TEMPLATES
  // ============================================================================
  {
    name: "Dropoff Complete",
    category: "dropoff",
    targetRecipientType: "parent",
    language: "en",
    messageText:
      "Go Happy Cab: {{child_name}} has been safely dropped off at {{location}} at {{time}}. Have a great day! 📚",
    variables: [
      { key: "child_name", label: "Child Name", required: true },
      { key: "location", label: "Dropoff Location", required: true },
      { key: "time", label: "Dropoff Time", required: true },
    ],
  },
  {
    name: "Entrega Concluída",
    category: "dropoff",
    targetRecipientType: "parent",
    language: "pt-BR",
    messageText:
      "Go Happy Cab: {{child_name}} foi entregue com segurança em {{location}} às {{time}}. Tenha um ótimo dia! 📚",
    variables: [
      { key: "child_name", label: "Nome da Criança", required: true },
      { key: "location", label: "Local de Entrega", required: true },
      { key: "time", label: "Hora da Entrega", required: true },
    ],
  },

  // ============================================================================
  // DRIVER TEMPLATES
  // ============================================================================
  {
    name: "Driver Assignment",
    category: "schedule",
    targetRecipientType: "driver",
    language: "en",
    messageText:
      "Go Happy Cab: You have been assigned a new route for {{date}} ({{period}}). {{child_count}} child(ren) scheduled. Check the app for details.",
    variables: [
      { key: "date", label: "Date", required: true },
      { key: "period", label: "Period (AM/PM)", required: true },
      { key: "child_count", label: "Number of Children", required: true },
    ],
  },
  {
    name: "Atribuição de Rota",
    category: "schedule",
    targetRecipientType: "driver",
    language: "pt-BR",
    messageText:
      "Go Happy Cab: Você recebeu uma nova rota para {{date}} ({{period}}). {{child_count}} criança(s) agendada(s). Verifique o aplicativo para detalhes.",
    variables: [
      { key: "date", label: "Data", required: true },
      { key: "period", label: "Período (AM/PM)", required: true },
      { key: "child_count", label: "Número de Crianças", required: true },
    ],
  },

  // ============================================================================
  // GENERAL/WEATHER TEMPLATES
  // ============================================================================
  {
    name: "Weather Cancellation",
    category: "general",
    targetRecipientType: "any",
    language: "en",
    messageText:
      "Go Happy Cab: Due to {{weather_condition}}, all routes for {{date}} have been cancelled. Stay safe! We will resume normal service when conditions improve.",
    variables: [
      { key: "weather_condition", label: "Weather Condition", required: true },
      { key: "date", label: "Date", required: true },
    ],
  },
  {
    name: "Cancelamento por Clima",
    category: "general",
    targetRecipientType: "any",
    language: "pt-BR",
    messageText:
      "Go Happy Cab: Devido a {{weather_condition}}, todas as rotas para {{date}} foram canceladas. Fique seguro! Retomaremos o serviço normal quando as condições melhorarem.",
    variables: [
      { key: "weather_condition", label: "Condição Climática", required: true },
      { key: "date", label: "Data", required: true },
    ],
  },

  // ============================================================================
  // PRE-CANCEL TEMPLATE
  // ============================================================================
  {
    name: "Pre-Cancel Confirmation",
    category: "schedule",
    targetRecipientType: "parent",
    language: "en",
    messageText:
      "Go Happy Cab: {{child_name}}'s route for {{date}} ({{period}}) has been cancelled as requested. If this was an error, please contact dispatch immediately.",
    variables: [
      { key: "child_name", label: "Child Name", required: true },
      { key: "date", label: "Date", required: true },
      { key: "period", label: "Period (AM/PM)", required: true },
    ],
  },
  {
    name: "Confirmação de Pré-Cancelamento",
    category: "schedule",
    targetRecipientType: "parent",
    language: "pt-BR",
    messageText:
      "Go Happy Cab: A rota de {{child_name}} para {{date}} ({{period}}) foi cancelada conforme solicitado. Se isso foi um erro, entre em contato com o dispatch imediatamente.",
    variables: [
      { key: "child_name", label: "Nome da Criança", required: true },
      { key: "date", label: "Data", required: true },
      { key: "period", label: "Período (AM/PM)", required: true },
    ],
  },
];

/**
 * Seed all initial templates
 */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    let created = 0;
    let skipped = 0;

    for (const template of INITIAL_TEMPLATES) {
      // Check if template with same name and language already exists
      const existing = await ctx.db
        .query("smsTemplates")
        .filter((q) =>
          q.and(
            q.eq(q.field("name"), template.name),
            q.eq(q.field("language"), template.language)
          )
        )
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("smsTemplates", {
        name: template.name,
        messageText: template.messageText,
        variables: template.variables,
        category: template.category as any,
        targetRecipientType: template.targetRecipientType as any,
        language: template.language as any,
        isActive: true,
        usageCount: 0,
        createdBy: "system",
        createdAt: now,
        updatedAt: now,
      });
      created++;
    }

    return {
      created,
      skipped,
      total: INITIAL_TEMPLATES.length,
    };
  },
});

/**
 * Clear all templates (use with caution!)
 */
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const allTemplates = await ctx.db.query("smsTemplates").collect();
    let deleted = 0;

    for (const template of allTemplates) {
      await ctx.db.delete(template._id);
      deleted++;
    }

    return { deleted };
  },
});
