import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import readline from "readline";

import dotenv from "dotenv";

dotenv.config();

const session = process.env.APP_SESSION;

const apiId = parseInt(process.env.APP_API_ID);
const apiHash = process.env.APP_API_HASH;
const stringSession = new StringSession(session);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

export default async function connect() {
    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });

    if (session) {
        console.log("connecting");
        await client.connect();
        // await client.sendMessage("@lex_tech", { message: "Hello!" });
        console.log("Connected")
    } else {
        await client.start({
            phoneNumber: async () =>
                new Promise((resolve) =>
                    rl.question("Please enter your number: ", resolve)
                ),
            password: async () =>
                new Promise((resolve) =>
                    rl.question("Please enter your password: ", resolve)
                ),
            phoneCode: async () =>
                new Promise((resolve) =>
                    rl.question("Please enter the code you received: ", resolve)
                ),
            onError: (err) => console.log(err),
        });

        console.log("You should now be connected.");
        console.log(client.session.save()); // Save this string to avoid logging in again
        await client.sendMessage("@lex_tech", { message: "Hello!" });
    }

    return client;
}