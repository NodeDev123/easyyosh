const keyboard = {
    en: {
        main: [
            [{ "text": "💰 My Balance 💰" }, { "text": "Share ↗️" }],
            [{ text: "Bonus 🎁" }],
            [{ "text": "Make a Withdrawal 🏦" }],
            [{ "text": "📌 Add a Number" }, { "text": "📋 Procedure 📋" }]
        ],
        settings(ctx) {
            return [
                [{ text: "Add/Modify", callback_data: `addNum_${ctx.from.id}` }]
            ]
        }
    },

    fr: {
        main: [
            [{ text: "💰 Mon Solde 💰" }, { text: "Partager ↗️" }],
            [{ text: "Bonus 🎁" }],
            [{ text: "Effectuer un Retrait 🏦" }],
            [{ text: "📌 Ajoutez un numéro" }, { text: "📋 Procédure 📋" }]
        ],
        settings(ctx) {
            return [
                [{ text: "Ajouter/Modifier", callback_data: `addNum_${ctx.from.id}` }]
            ]
        }
    },
};

export default keyboard;