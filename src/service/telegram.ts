import TelegramBot = require('node-telegram-bot-api');

export class TelegramService {
  private bot: TelegramBot;
  private chatId: string;

  /**
   * Initialize the Telegram bot service
   * @param token Bot token from BotFather
   * @param chatId The ID of the chat/channel where messages will be sent
   */
  constructor(token: string, chatId: string) {
    this.bot = new TelegramBot(token, { polling: false });
    this.chatId = chatId;
  }

  /**
   * Send a text message to the configured chat
   * @param message Text message to send
   */
  async sendMessage(message: string): Promise<TelegramBot.Message> {
    try {
      return await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      throw error;
    }
  }

  /**
   * Send a photo with caption
   * @param photoUrl URL of the photo to send
   * @param caption Optional caption text
   */
  async sendPhoto(photoUrl: string, caption?: string): Promise<TelegramBot.Message> {
    try {
      return await this.bot.sendPhoto(this.chatId, photoUrl, {
        caption,
        parse_mode: 'HTML',
      });
    } catch (error) {
      console.error('Error sending Telegram photo:', error);
      throw error;
    }
  }

  /**
   * Reply to a specific message
   * @param messageId ID of the message to reply to
   * @param text Text content of the reply
   */
  async replyToMessage(messageId: number, text: string): Promise<TelegramBot.Message> {
    try {
      const message = text.replace(/<(\/){0,1}br\s*\/?>/gi, '\n)').replace(/<[^>]*>/g, '');
      return await this.bot.sendMessage(this.chatId, message, {
        reply_to_message_id: messageId,
        parse_mode: 'HTML',
      });
    } catch (error) {
      console.error('Error sending Telegram reply:', error);
      throw error;
    }
  }
}
