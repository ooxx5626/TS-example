/* eslint-disable */
import * as dotenv from 'dotenv';

// 載入 .env 檔案中的環境變數
dotenv.config();

// 確保環境變數存在
const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

// 定義環境變數的類型 (TypeScript 特性)
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // TELEGRAM_BOT_TOKEN: string;
      // TELEGRAM_CHAT_ID: string;
      SERVER_PORT?: string;
      DEFAULT_SYMBOL?: string;
    }
  }
}

// 應用程式配置
interface AppConfig {
  // TelegramBotToken: string;
  // TelegramChatId: string;
  ServerPort?: number;
  DefaultSymbol?: string;
}

// 創建並導出配置對象
const config: AppConfig = {
  // TelegramBotToken: requireEnv('TELEGRAM_BOT_TOKEN'),
  // TelegramChatId: requireEnv('TELEGRAM_CHAT_ID'),
  ServerPort: process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 3000,
  DefaultSymbol: process.env.DEFAULT_SYMBOL || 'BTCUSDT',
};

export default config;
