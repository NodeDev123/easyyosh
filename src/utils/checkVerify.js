// import channels from "../config/channels.json" assert { type: 'json' };

import prisma from "../config/prisma.js";

export async function accountValid(ctx) {
    const CHANNELS = await prisma.channels.findMany({
        where: {
            type: "main",
            joinRequest: false,
            processStatus: {
                notIn: ["0", "1", "2"]
            }
        },
        select: {
            tgID: true
        }
    });

    const result = await CHANNELS.reduce(async (statPromise, channel) => {
        const stat = await statPromise;
        const user = await ctx.telegram.getChatMember(channel.tgID, ctx.from.id);
        const userLeft = !(user.status === "left" || user.status === "kicked")

        return stat * userLeft
    }, true)

    return result;
}