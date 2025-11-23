export const translations = {
    en: {
        newRouteTitle: "New Route Assigned 🚸",
        newRouteBody: (period: string, childName: string, date: string) => `You have a new ${period} route for ${childName} on ${date}`,
        reminderTitle: "Upcoming Pickup ⏰",
        reminderBody: (childName: string, minutes: number) => `Reminder: Pickup for ${childName} in ${minutes} minutes.`,
    },
    pt: {
        newRouteTitle: "Nova Rota Atribuída 🚸",
        newRouteBody: (period: string, childName: string, date: string) => `Você tem uma nova rota ${period} para ${childName} em ${date}`,
        reminderTitle: "Próxima Coleta ⏰",
        reminderBody: (childName: string, minutes: number) => `Lembrete: Coleta para ${childName} em ${minutes} minutos.`,
    }
};

export function getMessage(lang: string | undefined, key: keyof typeof translations['en'], ...args: any[]) {
    // Normalize language code
    let language: 'en' | 'pt' = 'en';
    if (lang) {
        const normalized = lang.toLowerCase();
        if (normalized === 'pt' || normalized === 'pt-br' || normalized === 'portuguese') {
            language = 'pt';
        }
    }

    const t = translations[language];
    const message = t[key];

    if (typeof message === 'function') {
        // @ts-ignore
        return message(...args);
    }
    return message;
}
