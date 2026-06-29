import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { db } from "../db";

const apiId = parseInt(process.env.TELEGRAM_API_ID || "0");
const apiHash = process.env.TELEGRAM_API_HASH || "";

export class TelegramService {
  private static instance: TelegramService;
  private client: TelegramClient | null = null;
  private isRunning: boolean = false;

  private constructor() {}

  public static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  public async initClient(sessionString: string) {
    if (this.client && this.client.connected) {
      return;
    }

    const stringSession = new StringSession(sessionString);
    this.client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });

    await this.client.connect();
    console.log("[TelegramService] GramJS Client conectado.");
  }

  private async humanDelay(minSec = 2, maxSec = 5) {
    const delayMs = Math.floor(Math.random() * (maxSec - minSec + 1) + minSec) * 1000;
    console.log(`[Human Behavior] Aguardando ${delayMs}ms para evitar FloodWait...`);
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  public async startJob(jobId: string, targetId: string) {
    if (!this.client) {
      throw new Error("Client não inicializado. Chame initClient primeiro com a StringSession do DB.");
    }
    if (this.isRunning) {
      console.log("[TelegramService] Atenção: Um job já está rodando em background.");
      return;
    }

    this.isRunning = true;
    try {
      console.log(`[Job ${jobId}] Iniciando coleta no alvo ${targetId}...`);

      let hasMore = true;
      let offsetId = 0;
      
      while (hasMore) {
        const result = await this.client.getMessages(targetId, { limit: 100, offsetId });
        
        if (result.length === 0) {
          hasMore = false;
          break;
        }

        offsetId = result[result.length - 1].id;
        
        const extractedLinks: string[] = [];
        const extractedDataToSave: any[] = [];

        for (const message of result) {
          let hasValidLink = false;

          // 1. Extrair links de botões Inline (replyMarkup)
          if (message.replyMarkup && (message.replyMarkup as any).rows) {
            for (const row of (message.replyMarkup as any).rows) {
              for (const button of row.buttons) {
                if (button.url) {
                  extractedLinks.push(button.url);
                }
              }
            }
          }

          // 2. Extrair links de MessageEntityTextUrl (Texto)
          if (message.entities) {
            for (const entity of message.entities) {
              if (entity.className === "MessageEntityTextUrl") {
                if ((entity as any).url) {
                   extractedLinks.push((entity as any).url);
                }
              }
            }
          }

          // Regra de Filtragem Estrita
          for (const link of extractedLinks) {
            if (link.includes("t.me/m/") || link.includes("?start=")) {
              continue; // Ignora
            }
            if (link.includes("t.me/+") || link.includes("joinchat")) {
              extractedDataToSave.push({
                jobId: jobId,
                messageId: message.id,
                content: message.message || "",
                link: link
              });
            }
          }
          // Reset array for next message
          extractedLinks.length = 0;
        }

        if (extractedDataToSave.length > 0) {
           await db.extractedData.createMany({
             data: extractedDataToSave
           });
           console.log(`[Job ${jobId}] Salvos ${extractedDataToSave.length} links valiosos.`);
        }

        await this.humanDelay();
      }

      console.log(`[Job ${jobId}] Job Finalizado com sucesso.`);
    } catch (error: any) {
      console.error(`[Job ${jobId}] Erro durante extração:`, error);
      
      if (error.errorMessage === "FLOOD_WAIT") {
        const waitTime = error.seconds || 30;
        console.warn(`[FloodWait] O Telegram exigiu um período de cooldown. Dormindo por ${waitTime}s.`);
        await new Promise(r => setTimeout(r, waitTime * 1000));
        throw new Error("FloodWait Timeout"); 
      }
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
}

export const telegramWorker = TelegramService.getInstance();
