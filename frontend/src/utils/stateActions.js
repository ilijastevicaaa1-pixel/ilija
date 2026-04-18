export const STATE_ACTIONS = {
    create_invoice: {
        steps: ['customer', 'amount', 'date'],
        questions: {
            customer: 'Pre koho je faktúra? (názov dodávateľa)',
            amount: 'Aká je suma faktúry?',
            date: 'Aký dátum vystavenia?',
        },
        endpoint: { method: 'POST', path: '/api/fakture' },
        validate: (data) => data.customer && data.amount > 0 && data.date,
    },
    create_bank_tx: {
        steps: ['amount', 'description', 'category'],
        questions: {
            amount: 'Aká je suma transakcie?',
            description: 'Popis transakcie?',
            category: 'Kategória (příjem/výdaj)?',
        },
        endpoint: { method: 'POST', path: '/api/banka' },
    },
    pdv_calc: {
        steps: ['period_start', 'period_end'],
        questions: {
            period_start: 'Začiatočný dátum obdobia DPH (YYYY-MM-DD)?',
            period_end: 'Konečný dátum obdobia DPH?',
        },
        endpoint: { method: 'POST', path: '/api/pdv-periodi/generisi' },
    },
};

export function getNextQuestion(action, step, data) {
    if (!STATE_ACTIONS[action]) return null;
    const config = STATE_ACTIONS[action];
    if (step >= config.steps.length) return null;
    const currentStep = config.steps[step];
    return config.questions[currentStep];
}
