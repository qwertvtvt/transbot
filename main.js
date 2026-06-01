const fs = require("fs");
const path = require("path");
const express = require("express");
const app = express();
const http = require("http").Server(app);
const bodyParser = require("body-parser");
const cors = require('cors');
const config = require("./config.json");
const { token, discordWebhookUrl, publicBaseUrl } = config;
const LineClient = require("./line");
const DiscordWebhook = require("./discord");
const client = new LineClient(token);
const discord = new DiscordWebhook(discordWebhookUrl);

const DocumentRoot = `${__dirname}/www`;
const PORT = config.port;
const Version = config.version;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const endpointsPath = path.join(__dirname, "endpoints");
fs.readdirSync(endpointsPath).forEach(function(file) {
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
            const data = await client.getMessageContent(event.message.id);
            const ext = event.message.type === "image" ? "jpg" : "mp4";
            const filename = `${event.message.id}.${ext}`;
            const filepath = path.join(__dirname, "uploads", filename);
            fs.writeFileSync(filepath, data);

            content = `${publicBaseUrl}/uploads/${filename}`;
        }
        
        await discord.send({
            username: name,
            avatarUrl: icon,
            content
        });
    }
});

http.listen(PORT, function() {
    console.log(`${Version} started on *:${PORT}`);
    client.sendPush(`Admin: ${Version} started on *:${PORT}`, "U7edec6c11714713b648728869091df7f");
});
