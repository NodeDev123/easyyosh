const handleError = async (err, ctx) => {
    if (err.message.includes("429")) {
        await ctx.telegram.sendMessage("1782278519", `${err}\n\n${new Date()}\n\n${ctx.from.id}`);
        return;
    }
    await ctx.telegram.sendMessage("1782278519", `${err}\n\n${new Date()}`);
    console.log(err);
};

export { handleError };
