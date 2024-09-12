
const start = async (ctx) => {
    ctx.reply(`Hello ${ctx.from.first_name}`);
};

export { start };
