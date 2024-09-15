import prisma from "./prisma.js";

async function getLinks() {
    let CHANNELS = await prisma.channels.findMany({
        where: {
            type: "main",
            processStatus: {
                notIn: ["0", "1", "2"]
            }
        },
        select: {
            link: true,
            withdrawalChannel: true
        }
    });

    const nonWithdrawalChannel = CHANNELS.filter(channel => !channel.withdrawalChannel)
    const withdrawalChannel = CHANNELS.filter(channel => channel.withdrawalChannel)

    CHANNELS = [...nonWithdrawalChannel, ...withdrawalChannel]

    return CHANNELS.reduce((prev, channel) => prev + `👉 ${channel.link}\n\n`, "");
}
const lang = {
    en: {
        welcome: "Congratulations! Your account is all set! 🎉\n\nFind out how to boost your earnings by clicking on '📋 Procedure 📋' under.💸",
        invalid: "❌ you must join all the channels !!",
        win: "🌠🎉 Dazzling Congratulations! 🎉🌠\n\n🚀 A Bonus of 750 FCFA has landed in your main account!",
        procedure: "🤔 Discover how to boost your earnings with the bot! It’s simple:\n\n1️⃣ Press “Share ↗️”\n2️⃣ Copy your unique link 📎\n3️⃣ Spread it in your Telegram groups 📢\n\n🎉 Each new member brings you 5500 FCFA instantly!\n\n🍀 Try your luck and grab this golden opportunity! 🌟",
        minText: "🚫 The minimum withdrawal amount is 66,000 CFA francs.",
        min(amount) {
            const remainingPersons = Math.ceil((66000 - amount) / 5500);

            return `🚫 The minimum withdrawal amount is 66 000 FCFA.\n\nInvite ${remainingPersons} more people to be able to complete your withdrawal`
        },
        num: "👉 First, add a withdrawal number.\n\nClick ‘📌 Add a number’ to proceed.",
        withdrawEx: "💰 Enter the withdrawal amount\n\nFor example: 55000",
        newNum: "Your withdrawal number has been successfully registered!",
        insufficiant: "Your balance is insufficient!! Please enter an amount less than ",
        withdraw: "Congratulations! Your withdrawal was successfully completed with flying colors!!! 🎉\n\nNote: Your money may take 5-15 days to be delivered. Please continue to invite new users to increase your withdrawal priority.",
        getNum: "Enter the number of the account to which you will receive your money.",
        taskIntro: "Welcome to the tasks menu! Complete missions to boost your earnings. 😊",
        taskMain: "Join these channels and then click ‘Check’ to claim your bonus",
        taskUnavailable: "No task is available at the moment. Please try again later.",
        taskComplete: "You have completed all the tasks for today. Come back tomorrow to perform other tasks.",
        taskDone: "Mission accomplished successfully. Come back tomorrow to perform new tasks.",
        taskAlert: "❌❌ Feel free to tackle those tasks!",
        minUsers(userName, invitedUsers) {
            return `Sorry, <b>${userName}</b>, your withdrawal has been declined.😔\n\nYou need to invite at least 5 or more people to complete a withdrawal.\n\nInvited user(s): ${invitedUsers} ❌ \n\nTo invite your friends, click on the ‘Share ↗️’ section.`
        },
        share(ctx, user) {
            return `💥 Here is your referral link to send to your friends to earn money! ⚙️⬇️

https://t.me/${ctx.botInfo.username}?start=user${ctx.from.id}

🚀 Total number invited: ${user.invitedUsers} user(s) 💫

♻️ You earn 5,500 FCFA for each person invited

🧏 Note: Referral is not mandatory, send “Bonus 🎁” to earn a bonus every hour

✅ You can request a withdrawal starting from 66,000 FCFA! 🛸`;
        },
        account(user) {
            return `🤴 Name : ${user.userName}\n\n💸 Balance : ${user.amount} FCFA\n\n⚜️ Invite new members and earn even more! 🎉\n\n🔑 Withdrawals are available from 30,000 FCFA! 🚀`;
        },
        settings(user) {
            return `🔧 Account Settings:\n\n🤴🏻 Username =  ${user.userName}\n🆔 User ID = ${user.userId}\n💼 Withdrawal Number = ${user.accountNumber}\n\n💹It will be used to send your money. \nClick the button 🔽 below to add or modify your number. `;
        },
        async start(ctx) {
            return `Welcome <b>${ctx.from.first_name}</b> to ECOBANK - DONAT Bot, 🚀\n\nI can help you win up to 300,000 FCFA 💰 per month.\n\nTo start, you must join all my channels. 📲\n\n${await getLinks()}`;
        },
        bonus(mins, secs) {
            return `🚀 Current Bonus Already Claimed!\n\n👾👾 Be back in precisely  ${mins} minutes and ${secs} seconds to claim your next bonus! ⏳`
        },
    },

    fr: {
        welcome: "Félicitations ! Votre compte est prêt ! 🎉\n\nDécouvrez comment booster vos gains en cliquant sur '📋 Procédure 📋' en-dessous 💸",
        invalid: "❌ vous devez rejoindre tout les canaux !!",
        win: "🌠🎉 Félicitations Éclatantes! 🎉🌠\n\n🚀 Un Bonus de 750 FCFA a atterri sur votre compte principal!",
        procedure: "🤔 Découvrez comment booster vos gains avec le bot ! C’est facile :\n\n1️⃣ Appuyez sur “Partager ↗️”\n2️⃣ Copiez votre lien unique 📎\n3️⃣ Diffusez - le dans vos groupes Telegram 📢\n\n🎉 Chaque nouveau membre vous rapporte 5500 FCFA instantanément!\n\n🍀 Tentez votre chance et saisissez cette opportunité en or! 🌟",
        minText: "🚫 Le montant minimum pour un retrait est de 66 000 FCFA.",
        min(amount) {
            const remainingPersons = Math.ceil((66000 - amount) / 5500);

            return `🚫 Le montant minimum pour un retrait est de 66 000 FCFA.\n\nInvitez encore ${remainingPersons} personnes pour pouvoir effectuer votre retrait.`
        },
        num: "👉 Ajoutez d’abord un numéro de retrait.\n\nCliquez sur ‘📌 Ajouter un numéro’ pour procéder.",
        withdrawEx: "💰 Entrez le montant que vous souhaitez retirer\n\nPar exemple: 55000",
        newNum: "Votre numéro de retrait a été enregistré avec succès !",
        insufficiant: "Votre solde est insuffisant !!\n\nVeuillez entrer une somme inférieure à ",
        withdraw: "Hourra ! Votre retrait a été réalisé avec succès !!! 🥳✨\n\nRemarque : Votre argent peut prendre 5 à 15 jours pour être livré. Veuillez continuer à inviter des utilisateurs pour augmenter votre priorité.",
        getNum: "Entrez le numero du compte sur lequelle vous allez recevoir votre argent.",
        taskIntro: "Bienvenue sur le menu des tâches ! Accomplissez des missions pour booster vos gains. 😊",
        taskMain: "Rejoignez ces canaux, puis cliquez sur ‘Check’ pour bénéficier de votre bonus.",
        taskUnavailable: "Aucune tâche n’est disponible pour le moment. Veuillez réessayer plus tard.",
        taskComplete: "Vous avez terminé toutes les tâches pour aujourd’hui. Revenez demain pour réaliser d’autres tâches.",
        taskDone: "Mission accomplie avec succès !!\n\nRevenez demain pour accomplir de nouvelles tâches.",
        taskAlert: "❌❌ Vous devez compléter les tâches !",
        minUsers(userName, invitedUsers) {
            return `Désolé <b>${userName}</b>, votre retrait a été refusé.😔\n\nIl faut invité au moins 5 personnes ou plus pour effectuer un retrait.\n\nNombre d'invites: ${invitedUsers} ❌\n\nPour inviter vos amis cliquez sur la partie “Partager ↗️”`
        },
        share(ctx, user) {
            return `💥 Voici ton lien de parrainage à envoyer à tes amis pour gagner de l’argent ! ⚙️ ⬇️

https://t.me/${ctx.botInfo.username}?start=user${ctx.from.id}

🚀 Nombre total invité : ${user.invitedUsers} utilisateur 💫 

♻️ Tu gagne 5,500 FCFA pour chaque personne invité 

🧏 NB: Le Parrainage n'est pas obligatoire, envoie "Bonus 🎁" pour gagne un bonus tous les heure

✅ Tu peux demander un retrait à partir de 66 000 FCFA! 🛸`;
        },
        account(user) {
            return `🤴 Nom: ${user.userName} \n\n💸 Solde actuel: ${user.amount} FCFA\n\n⚜️ Invité de nouveaux membres et gagnez encore plus\n\n🔑 Le retrait est disponible à partir de 66 000 FCFA! 🚀`;
        },
        settings(user) {
            return `🔧 Paramètres du compte:\n\nNom Utilisateur = ${user.userName}\n🆔 ID Utilisateur = ${user.userId}\n💼 Numéro de retrait = ${user.accountNumber}\n\n💹Il sera utilisé pour envoyer ton argent.\nClique sur le bouton 🔽 ci-dessous pour l’ajouter ou le changer`
        },
        async start(ctx) {
            return `Pour commencer veuillez d'abord rejoindre ces canaux :✅\n\n${await getLinks()}`;
        },
        bonus(mins, secs) {
            return `🚀 Bonus Actuel Déjà Attribué!\n\n👾 Reviens dans exactement ${mins} minutes ${secs} secondes pour décrocher ton prochain bonus ! ⏳`
        },
    },
};

export default lang;
