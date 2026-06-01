const fs = require("fs");
const path = require("path");
const express = require("express");
const app = express();
const http = require("http").Server(app);
const bodyParser = require("body-parser");
const cors = require('cors');
const config = require("./config.json");
const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || config.token;
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL || config.discordWebhookUrl;
const publicBaseUrl = process.env.PUBLIC_BASE_URL || config.publicBaseUrl;
const LineClient = require("./line");
const DiscordWebhook = require("./discord");
const client = new LineClient(token);
const discord = new DiscordWebhook(discordWebhookUrl);
const knex = require("./knex");
const cron = require("node-cron");

const DocumentRoot = `${__dirname}/www`;
const PORT = process.env.PORT || config.port;
const Version = config.version;
const authorId = process.env.LINE_ADMIN_USER_ID || config.authorId;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const endpointsPath = path.join(__dirname, "endpoints");
fs.readdirSync(endpointsPath).filter(function(file) {
    return path.extname(file) === ".js";
}).forEach(function(file) {
    const route = require(path.join(endpointsPath, file));
    app.use("/", route);
});

app.post("/webhook", async function (req, res) {
    res.sendStatus(200);

    for(const event of req.body.events) {
        if(event.type !== "message") continue;

        let name = "Guest (友だち登録で名前表示)";
        let icon = "";
        try {
            if(event.source.type == "group") {
                const profile = await client.getGroupMemberProfile(event.source.groupId, event.source.userId);
                name = profile.displayName;
                icon = profile.pictureUrl || "";
            } else if(event.source.type == "user") {
                const profile = await client.getProfile(event.source.userId);
                name = profile.displayName;
                icon = profile.pictureUrl || "";
            }
        } catch (error) {
            name = "Guest";
            icon = "";
        }

        let content = "";
        if(event.message.type == "text") {
            content = event.message.text;
        }
        if(event.message.type == "image" || event.message.type == "video") {
            const uploaded_at = Date.now();
            const data = await client.getMessageContent(event.message.id);
            const ext = event.message.type === "image" ? "jpg" : "mp4";
            const filename = `${event.message.id}.${ext}`;
            const filepath = path.join(__dirname, "uploads", filename);
            fs.writeFileSync(filepath, data);

            await knex("files").insert({
                filename,
                uploaded_at
            }).then(function() {
            }).catch(function(error) {
                console.log("DB保存でエラー:", error);
            });

            content = `${publicBaseUrl}/uploads/${filename}`;
        }

        await discord.send({
            username: name,
            avatarUrl: icon,
            content
        });
    }
});

cron.schedule("0 0 0 * * *", async function() {
    try {
        await knex.transaction(async function(trx) {
            const now = Date.now();
            const filesData = await trx("files").select("filename")
                                .where("uploaded_at", "<=", now - 30 * 24 * 60 * 60 * 1000);
            for(const file of filesData) {
                const filepath = path.join(__dirname, "uploads", file.filename);
                if(fs.existsSync(filepath)) fs.unlinkSync(filepath);
                await trx("files")
                    .where("filename", file.filename)
                    .del();
            }
        });
    } catch (error) {
        console.log("定期削除トランザクション失敗:", error);
    }
});

http.listen(PORT, function() {
    console.log(`${Version} started on *:${PORT}`);
    if(authorId) {
        client.sendPush(`Admin: ${Version} started on *:${PORT}`, authorId);
    }
});
