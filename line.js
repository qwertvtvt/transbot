const axios = require("axios");

class LineClient {
  constructor(token) {
    this.token = token;
    this.api = axios.create({
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`
      }
    });
    this.dataApi = axios.create({
      responseType: "arraybuffer",
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    });
  }

  async postMessage(path, body) {
    await this.api.post(`https://api.line.me/v2/bot/message/${path}`, body);
  }

  async sendReply(events, message) {
    if(!events || events.length === 0 || events[0].type !== "message") return;

    try {
      await this.postMessage("reply", {
        replyToken: events[0].replyToken,
        messages: [
          {
            type: "text",
            text: message
          }
        ]
      });
    } catch (error) {
      console.error("LINE reply error:", error.response?.data || error.message);
    }
  }

  async broadcast(message) {
    try {
      await this.postMessage("broadcast", {
        messages: [
          {
            type: "text",
            text: message
          }
        ]
      });
    } catch (error) {
      console.error("LINE broadcast error:", error.response?.data || error.message);
    }
  }

  async sendPush(message, userid) {
    try {
      await this.postMessage("push", {
        to: userid,
        messages: [
          {
            type: "text",
            text: message
          }
        ]
      });
    } catch(error) {
      console.error("LINE push error: ", error.response?.data || error.message);
    }
  }

  async getProfile(userid) {
    const response = await this.api.get(`https://api.line.me/v2/bot/profile/${userid}`);
    return response.data;
  }

  async getGroupMemberProfile(groupid, userid) {
    const response = await this.api.get(`https://api.line.me/v2/bot/group/${groupid}/member/${userid}`);
    return response.data;
  }

  async getMessageContent(messageId) {
    const response = await this.dataApi.get(`https://api-data.line.me/v2/bot/message/${messageId}/content`);
    return response.data;
  }
}

module.exports = LineClient;
