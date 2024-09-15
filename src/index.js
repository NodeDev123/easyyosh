import { Telegraf } from "telegraf";
import { message } from "telegraf/filters"

import dotenv from "dotenv";
import express from "express";

import { handleError } from "./commands/index.js";
import lang from "./config/lang.js";
import { accountValid } from "./utils/checkVerify.js";
import prisma from "./config/prisma.js"
import keyboard from "./config/keyboard.js";
import { v4 as uuid } from "uuid";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN || "";
// const ENVIRONMENT = process.env.NODE_ENV || "";

const isAdmin = (id) => [1782278519, 6227863810].includes(id);

const updateMainBoard = async (ctx) => {
    const CHANNELS = await prisma.channels.findMany({
        where: {
            type: "main",
            processStatus: {
                notIn: ["0", "1", "2"]
            }
        },
        select: {
            name: true,
            id: true,
            withdrawalChannel: true
        }
    });

    const message = "Les canaux abligatoire";

    const keyboard = CHANNELS.map(channel => ([{
        text: `${channel.name}${channel.withdrawalChannel ? "🤑" : ""}`,
        callback_data: `edit_${channel.id}`
    }]))

    await ctx.telegram.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, undefined, message, {
        reply_markup: {
            inline_keyboard: [
                ...keyboard,
                [{ text: "Ajoute un canal", callback_data: "settings_add_main" }],
                [{ text: "🔙 Retour", callback_data: "back_settings" }]
            ]
        }
    })
}

const updateTaskBoard = async (ctx) => {
    const CHANNELS = await prisma.task.findMany({
        where: {
            processStatus: {
                notIn: ["0", "1", "2"]
            }
        }
    });

    const message = "Vos taches !!";

    const keyboard = CHANNELS.map(channel => ([{
        text: channel.link,
        callback_data: `editTask_${channel.id}`
    }]))

    console.log(keyboard)

    await ctx.telegram.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, undefined, message, {
        reply_markup: {
            inline_keyboard: [
                ...keyboard,
                [{ text: "Ajoute une tache", callback_data: "settings_add_task" }],
                [{ text: "🔙 Retour", callback_data: "back_settings" }]
            ]
        }
    })
}

const cancelMain = async () => {
    const isCreating = await prisma.channels.findFirst({
        where: {
            processStatus: {
                in: ["0", "1", "2"]
            }
        }
    })

    if (isCreating) {
        await prisma.channels.delete({
            where: {
                id: isCreating.id
            }
        })
    }

    return Boolean(isCreating);
}
const cancelTask = async () => {
    const isCreating = await prisma.task.findFirst({
        where: {
            processStatus: {
                in: ["0", "1", "2"]
            }
        }
    })

    if (isCreating) {
        await prisma.task.delete({
            where: {
                id: isCreating.id
            }
        })
    }

    return Boolean(isCreating);
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();

app.use(await bot.createWebhook({ domain: process.env.webhookDomain, drop_pending_updates: true }));

app.get("/", (req, res) => {
    res.send("Bot started");
});


bot.use(async (ctx, next) => {
    if (["7033815126", "6997411585", "7420435134", "6855346047", "7236624669", "7326328335", "7261403415"].includes(ctx.from?.id.toString())) {
        return;
    }

    await next();
})

bot.start(async (ctx) => {
    const welcomeMsg = await ctx.reply("Veuillez patienter… ⏳😊");

    const startPayload = ctx.payload;
    const language_code = ctx.from?.language_code === "fr" ? "fr" : "en";

    const user = await prisma.user.findUnique({
        where: {
            userId: ctx.from.id.toString()
        }
    })

    if (!user) {
        if (startPayload) {
            const userId = startPayload.slice(4);

            const inviter = await prisma.user.update({
                data: {
                    invitedUsers: {
                        increment: 1
                    },
                    amount: {
                        increment: 5500
                    }
                },
                where: {
                    userId: userId
                },
                select: {
                    userName: true
                }
            })

            await ctx.reply(`${ctx.from?.language_code === "fr" ? "Tu as été invitée par" : "You have been invited by"} ${inviter.userName} 🎉`);
        }

        await prisma.user.create({
            data: {
                userId: ctx.from.id.toString(),
                userName: ctx.from.first_name,
                lastBonusDate: new Date(2000, 11, 1)
            }
        })
    }

    const isAccountValid = await accountValid(ctx);

    if (!isAccountValid) {
        const starterText = await lang[language_code].start(ctx);

        await ctx.telegram.editMessageText(ctx.chat.id, welcomeMsg.message_id, undefined, starterText, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✅ Vérifiez", callback_data: `verify_${ctx.from.id}` }]
                ]
            },
            parse_mode: "HTML",
            link_preview_options: {
                is_disabled: true
            }
        })

        return;
    }

    if (isAccountValid) {
        await ctx.reply("Continue à partager ton lien pour gagner encore plus d’argent. 💰", {
            reply_markup: {
                keyboard: [
                    [{ text: "💰 Mon Solde 💰" }, { text: "Partager ↗️" }],
                    [{ text: "Bonus 🎁" }, { text: "🚩 Tâche" }],
                    [{ text: "Effectuer un Retrait 🏦" }],
                    [{ text: "📌 Ajoutez un numéro" }, { text: "📋 Procédure 📋" }]
                ],
                resize_keyboard: true
            }
        });

        await ctx.deleteMessage(welcomeMsg.message_id);
    }

});

bot.command("settings", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;

    await ctx.reply("Beinvenue sur les parametres ⚙, confugurer votre bot comme vos le voulais 🤖\n\n<b>NB: This function is still in beta phase. Please report any errors to the bot <a href='https://t.me/lex_tech'>developer</a>.</b>", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Main", callback_data: "settings_main" }, { text: "Tasks", callback_data: "settings_tasks" }]
            ]
        },
        parse_mode: "HTML",
        link_preview_options: {
            is_disabled: true
        }
    });
})

bot.command("cancel_main", async (cxt) => {
    const processExists = await cancelMain();

    await ctx.reply(processExists ? "Process canceled" : "Nothing to cancel")
})

bot.command("cancel_task", async (ctx) => {
    const processExists = await cancelTask();

    await ctx.reply(processExists ? "Process canceled" : "Nothing to cancel")
})

bot.command("channel", async (ctx) => {
    console.log(ctx.message.reply_to_message.forward_origin.chat.id)
})

bot.on("message", async (ctx) => {
    const text = ctx.message.text;
    const language_code = ctx.from?.language_code === "fr" ? "fr" : "en";

    const user = await prisma.user.findUnique({
        where: {
            userId: ctx.from.id.toString()
        }
    })

    if (isAdmin(ctx.from.id)) {
        const forwardedMessageChannelId = ctx.message?.forward_origin?.chat?.id;
        const forwardedMessageChannelName = ctx.message?.forward_origin?.chat?.title;

        if (text?.startsWith("https://t.me/")) {
            const channelAdd = await prisma.channels.findFirst({
                where: {
                    processStatus: "0"
                }
            })

            const taskAdd = await prisma.task.findFirst({
                where: {
                    processStatus: "0"
                }
            })

            if (channelAdd) {
                await prisma.channels.update({
                    where: {
                        processStatus: "0",
                    },
                    data: {
                        link: text,
                        processStatus: "1"
                    }
                })
            }

            if (taskAdd) {
                await prisma.task.update({
                    where: {
                        processStatus: "0",
                    },
                    data: {
                        link: text,
                        processStatus: "1"
                    }
                })
            }

            await ctx.reply("Transfert moi un message du canal a utilise");
        }

        if (forwardedMessageChannelId) {
            const channelAdd = await prisma.channels.findFirst({
                where: {
                    processStatus: "1"
                }
            })

            const taskAdd = await prisma.task.findFirst({
                where: {
                    processStatus: "1"
                }
            })

            if (channelAdd) {
                await prisma.channels.update({
                    where: {
                        processStatus: "1"
                    },
                    data: {
                        tgID: forwardedMessageChannelId.toString(),
                        name: forwardedMessageChannelName.slice(0, 30) + "...",
                        processStatus: "2"
                    }
                })

                await ctx.reply("Do you want to force channel", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "Yes", callback_data: "forced_yes" }, { text: "No", callback_data: "forced_no" }]
                        ]
                    }
                })

                return;
            }

            if (taskAdd) {
                await prisma.task.update({
                    where: {
                        processStatus: "1"
                    },
                    data: {
                        chatId: forwardedMessageChannelId.toString(),
                        processStatus: "2"
                    }
                })
            }

            await ctx.reply("Plus qu'une dernier etape pour ajoute votre lien.Veillez repondre a la question\n\nVotre le lien est avec demande d'adhesion", {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Oui", callback_data: "link_yes" }, { text: "Non", callback_data: "link_no" }]
                    ]
                }
            });

            return;
        }
    }

    if (text === "Bonus 🎁") {
        // Calculer la différence en millisecondes
        let difference = new Date() - new Date(user.lastBonusDate);

        // Convertir la différence en heures
        let differenceInHours = difference / 1000 / 60 / 60;

        // Vérifier si la différence est égale à 1 heure
        if (differenceInHours >= 1) {
            await prisma.user.update({
                where: {
                    userId: ctx.from.id.toString()
                },
                data: {
                    amount: {
                        increment: 750,
                    },
                    lastBonusDate: new Date()
                }
            })

            await ctx.reply(lang[language_code].win);
        } else {
            // Définir l'heure donnée et l'heure actuelle
            let givenTime = new Date(user.lastBonusDate);
            let currentTime = new Date();

            // Ajouter une heure (3600000 millisecondes) à l'heure donnée
            let timePlusOneHour = new Date(givenTime.getTime() + 3600000);

            // Calculer la différence en millisecondes
            let timeRemaining = timePlusOneHour - currentTime;

            // Convertir la différence en minutes et secondes
            let minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
            let secondsRemaining = Math.floor((timeRemaining % (1000 * 60)) / 1000);

            await ctx.reply(lang[language_code].bonus(minutesRemaining, secondsRemaining), {
                reply_markup: {
                    keyboard: [
                        [{ text: "💰 Mon Solde 💰" }, { text: "Partager ↗️" }],
                        [{ text: "Bonus 🎁" }, { text: "🚩 Tâche" }],
                        [{ text: "Effectuer un Retrait 🏦" }],
                        [{ text: "📌 Ajoutez un numéro" }, { text: "📋 Procédure 📋" }]
                    ],
                    resize_keyboard: true
                }
            });
        }
        return;
    }

    if (text === "📌 Ajoutez un numéro" || text === "📌 Add a Number") {
        await ctx.reply(lang[language_code].settings(user), {
            reply_markup: {
                inline_keyboard: keyboard[language_code].settings(ctx)
            }
        })

        return;
    }

    if (text === "💰 Mon Solde 💰" || text === "💰 My Balance 💰") {
        await ctx.reply(lang[language_code].account(user), {
            reply_markup: {
                keyboard: [
                    [{ text: "💰 Mon Solde 💰" }, { text: "Partager ↗️" }],
                    [{ text: "Bonus 🎁" }, { text: "🚩 Tâche" }],
                    [{ text: "Effectuer un Retrait 🏦" }],
                    [{ text: "📌 Ajoutez un numéro" }, { text: "📋 Procédure 📋" }]
                ],
                resize_keyboard: true
            }
        })

        return;
    }

    if (text === "Partager ↗️" || text === "Share ↗️") {
        await ctx.reply(lang[language_code].share(ctx, user), {
            reply_markup: {
                keyboard: [
                    [{ text: "💰 Mon Solde 💰" }, { text: "Partager ↗️" }],
                    [{ text: "Bonus 🎁" }, { text: "🚩 Tâche" }],
                    [{ text: "Effectuer un Retrait 🏦" }],
                    [{ text: "📌 Ajoutez un numéro" }, { text: "📋 Procédure 📋" }]
                ],
                resize_keyboard: true
            }
        });

        return;
    }

    if (text === "📋 Procédure 📋" || text === "📋 Procedure 📋") {
        await ctx.reply(lang[language_code].procedure, {
            reply_markup: {
                keyboard: [
                    [{ text: "💰 Mon Solde 💰" }, { text: "Partager ↗️" }],
                    [{ text: "Bonus 🎁" }, { text: "🚩 Tâche" }],
                    [{ text: "Effectuer un Retrait 🏦" }],
                    [{ text: "📌 Ajoutez un numéro" }, { text: "📋 Procédure 📋" }]
                ],
                resize_keyboard: true
            }
        });

        return;
    }

    if (text === "Effectuer un Retrait 🏦" || text === "Make a Withdrawal 🏦") {
        if (user.amount < 66000) {
            await ctx.reply(lang[language_code].min(user.amount));

            return;
        }
        if (!user.accountNumber) {
            await ctx.reply(lang[language_code].num);

            return;
        }

        await prisma.user.update({
            where: {
                userId: ctx.from.id.toString()
            },
            data: {
                status: "withdraw"
            }
        })

        await ctx.reply(lang[language_code].withdrawEx);

        return;
    }

    if (text === "🚩 Tâche" || text === "🚩 Task") {
        const today = new Date();
        const lastTaskDate = new Date(user.lastTaskDate);

        let availableTasks = [];

        if (today.getDate() === lastTaskDate.getDate() && today.getMonth() === lastTaskDate.getMonth()) {
            if (user.taskIds === "") {
                await ctx.reply(lang[language_code].taskComplete);

                return;
            }

            const currentTaskIds = user.taskIds.split("|");

            availableTasks = await prisma.task.findMany({
                where: {
                    id: {
                        in: currentTaskIds
                    },
                    processStatus: {
                        notIn: ["0", "1", "2"]
                    }
                },
                orderBy: {
                    priority: "desc"
                }
            })

        } else {
            const completedTasks = await prisma.userTasks.findMany({
                where: {
                    userId: ctx.from.id.toString()
                },
                select: {
                    taskId: true
                }
            })

            const completedTasksId = completedTasks.map((task) => task.taskId)

            availableTasks = (await prisma.task.findMany({
                where: {
                    NOT: {
                        id: {
                            in: completedTasksId
                        }
                    }
                },
                orderBy: {
                    priority: "desc"
                },
                take: 2
            })).filter(task => (!["0", "1", "2"].includes(task.processStatus)))

            await prisma.user.update({
                where: {
                    userId: ctx.from.id.toString(),
                },
                data: {
                    taskIds: availableTasks.map((task) => task.id).join("|"),
                    lastTaskDate: new Date()
                }
            })
        }


        if (availableTasks.length === 0) {
            await ctx.reply(lang[language_code].taskUnavailable);

            return;
        }


        const displayTasks = availableTasks.reduce((curVal, task) => {
            return curVal + `\n\n👉 ${task.link}\n💸 Gains: ${task.reward} FCFA`
        }, "")

        const callback_data = availableTasks.reduce((curVal, task) => {
            return curVal + `_${task.id}`
        }, "task")

        await ctx.reply(lang[language_code].taskIntro);
        await ctx.reply(`${lang[language_code].taskMain}:${displayTasks}\n\n${language_code === "fr" ? "Terminé" : "Done"}: ${2 - availableTasks.length}/2`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✅ Check", callback_data }]
                ]
            },
            link_preview_options: {
                is_disabled: true
            }
        })
    }

    if (user?.status === "AddingNum") {
        await prisma.user.update({
            where: {
                userId: ctx.from.id.toString()
            },
            data: {
                accountNumber: text,
                status: "Idle"
            }
        })

        await ctx.reply(lang[language_code].newNum, {
            reply_markup: {
                keyboard: keyboard[language_code].main
            }
        });

        return;
    }

    if (user?.status === "withdraw" && Boolean(parseInt(text))) {
        const withdrawAmount = parseInt(text);

        if (withdrawAmount > user.amount) {
            await ctx.reply(lang[language_code].insufficiant + user.amount + "FCFA.");

            return;
        }

        if (withdrawAmount < 66000) {
            await ctx.reply(lang[language_code].minText);

            return;
        }

        if (user.invitedUsers < 5) {
            await ctx.reply(lang[language_code].minUsers(user.userName, user.invitedUsers), {
                parse_mode: "HTML"
            });

            return;
        }

        await ctx.reply(lang[language_code].withdraw);

        await prisma.user.update({
            where: {
                userId: ctx.from.id.toString()
            },
            data: {
                status: "Idle",
                hasWithdrawn: true,
                amount: {
                    decrement: withdrawAmount
                }
            }
        });

        const REACTIONS = [
            {
                emoji: "👍",
                type: "emoji"
            },
            {
                emoji: "🔥",
                type: "emoji"
            },
            {
                emoji: "❤",
                type: "emoji"
            }
        ];
        const randomNumber = Math.floor(Math.random() * 3);

        const withdrawalChannel = await prisma.channels.findFirst({
            where: {
                withdrawalChannel: true
            },
            select: {
                tgID: true
            }
        })

        if (!withdrawalChannel) return;

        const message = await ctx.telegram.sendMessage(withdrawalChannel?.tgID, `⚔ NOUVEAU RETRAIT ⚔\n\n▪️ Status : Approuvé ✅\n▪️ User Identifiant: ${ctx.from.id}\n▪️ Retrait effectué par: ${user.userName}\n▪️ Montant Retiré : ${withdrawAmount} FCFA\n\n🤴 Bot @${ctx.botInfo.username}`, {
            disable_notification: true
        });
        await ctx.telegram.setMessageReaction(withdrawalChannel?.tgID, message.message_id, [REACTIONS[randomNumber]])
    }

})

bot.on("chat_join_request", async (ctx) => {
    const taskId = await prisma.task.findFirst({
        where: {
            chatId: ctx.chatJoinRequest.chat.id.toString()
        },
        select: {
            id: true
        }
    })

    if (!taskId) return;

    await prisma.userTasks.create({
        data: {
            userId: ctx.from.id.toString(),
            taskId: taskId?.id
        }
    })
})

bot.on("callback_query", async (ctx) => {
    const callback_data = ctx.callbackQuery.data;

    const command = callback_data.split("_")[0];

    const language_code = ctx.from?.language_code === "fr" ? "fr" : "en";

    if (command === "verify") {
        const isAccountValid = await accountValid(ctx);

        if (!isAccountValid) {
            await ctx.reply(lang[language_code].invalid);
            return;
        }


        await ctx.reply(lang[language_code].welcome, {
            reply_markup: {
                keyboard: keyboard[language_code].main,
                resize_keyboard: true
            }
        });

    }

    if (command === "addNum") {
        await ctx.reply(lang[language_code].getNum);

        await prisma.user.update({
            where: {
                userId: ctx.from.id.toString()
            },
            data: {
                status: "AddingNum"
            }
        })
    }

    if (command === "task") {
        const completedTasksId = [];
        const uncompletedTasksId = [];
        const availableTasks = [];

        for (const payload of callback_data.split("_").slice(1)) {
            const task = await prisma.task.findUnique({
                where: {
                    id: payload
                }
            })

            if (!task) return;

            availableTasks.push(task);

            let done = false;

            if (payload.slice(2, 4) == "11") {
                done = await prisma.userTasks.findFirst({
                    where: {
                        userId: ctx.from.id.toString(),
                        taskId: payload
                    }
                })
            }

            if (payload.slice(2, 4) == "22") {
                const user = await ctx.telegram.getChatMember(task.chatId, ctx.from.id);
                done = !(user.status === "left" || user.status === "kicked");

                if (done) {
                    await prisma.userTasks.create({
                        data: {
                            userId: ctx.from.id.toString(),
                            taskId: payload
                        }
                    })
                }
            }

            if (done) {
                completedTasksId.push(task.id);

                await prisma.user.update({
                    where: {
                        userId: ctx.from.id.toString()
                    },
                    data: {
                        amount: {
                            increment: task.reward
                        }
                    }
                })
            } else {
                uncompletedTasksId.push(task.id)
            }
        }

        await prisma.user.update({
            where: {
                userId: ctx.from.id.toString(),
            },
            data: {
                taskIds: uncompletedTasksId.join("|"),
            }
        })

        if (completedTasksId.length === 0) {
            await ctx.answerCbQuery(lang[language_code].taskAlert)

            return;
        }

        if (completedTasksId.length === callback_data.split("_").slice(1).length) {
            await ctx.deleteMessage();

            await ctx.reply(lang[language_code].taskDone)

            return;
        }

        const displayTasks = availableTasks.filter((task) => !completedTasksId.includes(task.id)).reduce((curVal, task) => {
            return curVal + `\n\n👉 ${task.link}\n💸 Gains: ${task.reward} FCFA`
        }, "")

        const command = uncompletedTasksId.reduce((curVal, taskId) => {
            return curVal + `_${taskId}`
        }, "task")

        await ctx.telegram.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, undefined, `${lang[language_code].taskMain}: ${displayTasks}\n\n${language_code === "fr" ? "Terminé" : "Done"}: ${completedTasksId.length}/2`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✅ Check", callback_data: command }]
                ]
            },
            link_preview_options: {
                is_disabled: true
            }
        })
    }

    if (command === "edit") {
        const channel = await prisma.channels.findUnique({
            where: {
                id: callback_data.split("_")[1]
            },
        });

        const message = `Nom: ${channel.name}\n\nLien: ${channel.link}\n\nType: ${channel.type === "main" ? "Canal obligatoire" : "Tache"}`

        await ctx.telegram.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, undefined, message, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Modifier", callback_data: `channelEdit_${channel.id}` }, { text: "Supprime", callback_data: `channelDelete_${channel.id}` }],
                    [{ text: "Canal De Retrait", callback_data: `change_${channel.id}` }],
                    [{ text: "🔙 Retour", callback_data: channel.type === "main" ? "back_main" : "back_tasks" }]
                ]
            },
            link_preview_options: {
                is_disabled: true
            }
        })
    }

    if (command === "editTask") {
        const channel = await prisma.task.findUnique({
            where: {
                id: callback_data.split("_")[1]
            },
        });

        const message = `Lien: ${channel.link}\n\nType: ${channel?.type === "main" ? "Canal obligatoire" : "Tache"}`

        await ctx.telegram.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, undefined, message, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Modifier", callback_data: `channelEditTask_${channel.id}` }, { text: "Supprime", callback_data: `channelDeleteTask_${channel.id}` }],
                    [{ text: "🔙 Retour", callback_data: channel.type === "main" ? "back_main" : "back_tasks" }]
                ]
            },
            link_preview_options: {
                is_disabled: true
            }
        })
    }

    if (command === "channelEdit") {

        await prisma.channels.update({
            where: {
                id: callback_data.split("_")[1]
            },
            data: {
                processStatus: "0"
            }
        })

        await ctx.reply("Envoie moi le lien du nouveau canal...");
    }

    if (command === "channelEditTask") {

        await prisma.task.update({
            where: {
                id: callback_data.split("_")[1]
            },
            data: {
                processStatus: "0"
            }
        })

        await ctx.reply("Envoie moi le lien du nouveau canal...");
    }

    if (command === "channelDelete") {
        await prisma.channels.delete({
            where: {
                id: callback_data.split("_")[1]
            }
        })

        await ctx.answerCbQuery("Le canal a etait supprime", {
            show_alert: false
        });

        await updateMainBoard(ctx);
    }

    if (command === "channelDeleteTask") {
        console.log(callback_data.split("_")[1])
        await prisma.task.delete({
            where: {
                id: callback_data.split("_")[1]
            }
        })

        await ctx.answerCbQuery("Le canal a etait supprime", {
            show_alert: false
        });

        await updateTaskBoard(ctx);
    }

    if (callback_data === "settings_main" || callback_data === "back_main") {
        await updateMainBoard(ctx);
    }

    if (callback_data === "settings_tasks" || callback_data === "back_tasks") {
        await updateTaskBoard(ctx);
    }

    if (callback_data === "settings_add_main") {
        await cancelMain();

        await prisma.channels.create({
            data: {
                processStatus: "0",
                type: "main",
            }
        })

        await ctx.reply("Envoie moi le lien du canal a ajoute");
    }

    if (callback_data === "settings_add_task") {
        await cancelTask();

        await prisma.task.create({
            data: {
                id: "TK0000",
                processStatus: "0"
            }
        })

        await ctx.reply("Envoie moi le lien du canal a ajoute");
    }

    if (callback_data === "back_settings") {
        await ctx.telegram.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, undefined, "Beinvenue sur les parametres ⚙, confugurer votre bot comme vos le voulais 🤖", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Main", callback_data: "settings_main" }, { text: "Tasks", callback_data: "settings_tasks" }]
                ]
            }
        });
    }

    if (callback_data === "link_yes" || callback_data === "forced_no") {
        const channelAdd = await prisma.channels.findFirst({
            where: {
                processStatus: "2"
            }
        })

        const taskAdd = await prisma.task.findFirst({
            where: {
                processStatus: "2"
            }
        })

        if (channelAdd) {
            await prisma.channels.update({
                where: {
                    processStatus: "2"
                },
                data: {
                    joinRequest: true,
                    processStatus: uuid()
                }
            })
        }

        if (taskAdd) {
            const lastAddedJoinTaskId = await prisma.task.count({
                where: {
                    id: {
                        contains: "11"
                    }
                }
            })

            const lastAddedTaskId = await prisma.task.count();

            await prisma.task.update({
                where: {
                    processStatus: "2"
                },
                data: {
                    joinRequest: true,
                    reward: 1500,
                    id: taskAdd.id === "TK0000" ? `TK11${lastAddedJoinTaskId + 1}` : taskAdd.id.includes("22") ? `TK11${lastAddedJoinTaskId + 1}` : taskAdd.id,
                    priority: taskAdd.id === "TK0000" ? lastAddedTaskId - 1 : taskAdd.priority,
                    processStatus: uuid()
                }
            })
        }

        await ctx.editMessageReplyMarkup({
            inline_keyboard: []
        })

        await ctx.reply("Nice !!");
    }

    if (callback_data === "link_no" || callback_data === "forced_yes") {
        const channelAdd = await prisma.channels.findFirst({
            where: {
                processStatus: "2"
            }
        })

        const taskAdd = await prisma.task.findFirst({
            where: {
                processStatus: "2"
            }
        })

        if (channelAdd) {
            try {
                const botStatus = await ctx.telegram.getChatMember(channelAdd.tgID, ctx.botInfo.id);

                if (botStatus.status !== "administrator" && !botStatus.can_invite_users) {
                    await ctx.reply("Verifier que le bot sois admins avec la permission d'ajoute des nouveau membre. Puis reessayer");

                    return;
                }
            } catch (error) {
                console.log(error)
                await ctx.reply("Verifier que le bot sois admins et reessayer.\n\nSi le probleme persist contacte le dev.");
                return;
            }


            await prisma.channels.update({
                where: {
                    processStatus: "2"
                },
                data: {
                    joinRequest: false,
                    processStatus: uuid()
                }
            })
        }

        if (taskAdd) {
            const lastAddedJoinTaskId = await prisma.task.count({
                where: {
                    id: {
                        contains: "22"
                    }
                }
            })

            console.log(lastAddedJoinTaskId)

            const lastAddedTaskId = await prisma.task.count();

            await prisma.task.update({
                where: {
                    processStatus: "2"
                },
                data: {
                    joinRequest: false,
                    reward: 1500,
                    id: taskAdd.id === "TK0000" ? `TK22${lastAddedJoinTaskId + 1}` : taskAdd.id.includes("11") ? `TK22${lastAddedJoinTaskId + 1}` : taskAdd.id,
                    priority: taskAdd.id === "TK0000" ? lastAddedTaskId - 1 : taskAdd.priority,
                    processStatus: uuid()
                }
            })
        }

        await ctx.editMessageReplyMarkup({
            inline_keyboard: []
        })

        await ctx.reply("Nice !!");
    }

    if (command === "change") {
        const withdrawChannel = await prisma.channels.findFirst({
            where: {
                id: callback_data.split("_")[1]
            },
            select: {
                name: true,
                link: true,
                id: true
            }
        })

        await ctx.reply(`By clicking Continue the withdrawal channel will be change to:\n\n👉 <a href="${withdrawChannel?.link}">${withdrawChannel?.name}</a>`, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Continue", callback_data: `continue_${withdrawChannel?.id}` }, { text: "Cancel", callback_data: "cancel" }]
                ]
            },
            link_preview_options: {
                is_disabled: true
            }
        })
    }

    if (command === "continue") {
        const oldWithDrawChannel = await prisma.channels.findFirst({
            where: {
                withdrawalChannel: true
            },
            select: {
                id: true
            }
        })


        await prisma.channels.update({
            where: {
                id: callback_data.split("_")[1]
            },
            data: {
                withdrawalChannel: true
            }
        });

        oldWithDrawChannel?.id && await prisma.channels.update({
            where: {
                id: oldWithDrawChannel.id
            },
            data: {
                withdrawalChannel: false
            }
        });

        await ctx.editMessageReplyMarkup({
            inline_keyboard: []
        })

        await ctx.reply("Withdrawal channel change...");
    }

    if (callback_data === "cancel") {
        await ctx.editMessageReplyMarkup({
            inline_keyboard: []
        })

        await ctx.answerCbQuery("WTF !! Don't disturb...", {
            show_alert: true,
            cache_time: 1000
        })
    }
});

bot.catch(handleError);

app.listen(process.env.PORT || 3000, () => {
    console.log("Ready")
})

// bot.launch();

// console.log("Bot Started")