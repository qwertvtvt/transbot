const axios = require("axios");

class DiscordWebhook {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async send({ username, avatarUrl, content }) {
    if (!this.webhookUrl) return;
    if (!content) return;

    try {
      await axios.post(this.webhookUrl, {
        username,
        avatar_url: avatarUrl || undefined,
        content,
        allowed_mentions: {
          parse: []
        }
      });
    } catch (error) {
      console.error("Discord webhook error:", error.response?.data || error.message);
    }
  }
}

module.exports = DiscordWebhook;
