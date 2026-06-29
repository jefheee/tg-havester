import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
// import { db } from "@/lib/db"; // Será implementado quando criarmos o cliente global do Prisma

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

  // Inicializa o Client garantindo que haja apenas uma instância na memória do Worker
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

  // Atraso de Comportamento Humano (Human Behavior Delay)
  private async humanDelay(minSec = 2, maxSec = 5) {
    const delayMs = Math.floor(Math.random() * (maxSec - minSec + 1) + minSec) * 1000;
    console.log(`[Human Behavior] Aguardando ${delayMs}ms para evitar FloodWait...`);
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  // Execução do Job de Extração Iterativo com Paginação Segura
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
      
      // Atualizar status no DB (Exemplo)
      // await db.scrapeJob.update({ where: { id: jobId }, data: { status: "RUNNING" } });

      let hasMore = true;
      let offsetId = 0;
      
      while (hasMore) {
        // Exemplo: getMessages pode ser substituído pela API equivalente baseada na Entity do Telegram
        // const result = await this.client.getMessages(targetId, { limit: 20, offsetId });
        
        // Mocking de uma busca para ilustrar a arquitetura e delay:
        console.log(`[Job ${jobId}] Fetching de mensagens com offsetId: ${offsetId}...`);
        
        /* 
          // Tratamento da array result:
          if (result.length === 0) {
            hasMore = false;
            break;
          }
          offsetId = result[result.length - 1].id;
          
          // Salvar mensagens extraídas
          await db.extractedData.createMany({ data: ... })
        */
        
        // Simulação do loop de extração. Remova após implementar chamadas reais.
        offsetId += 20; 
        if (offsetId > 100) hasMore = false;

        // OBRIGATÓRIO: Aplicar o Human Delay após processar cada lote/página
        await this.humanDelay();
      }

      console.log(`[Job ${jobId}] Job Finalizado com sucesso.`);
      // Atualizar DB
      // await db.scrapeJob.update({ where: { id: jobId }, data: { status: "COMPLETED" } });
    } catch (error: any) {
      console.error(`[Job ${jobId}] Erro durante extração:`, error);
      
      // Tratamento Específico de FloodWait (Proteção Anti-Ban Avançada)
      if (error.errorMessage === "FLOOD_WAIT") {
        const waitTime = error.seconds || 30;
        console.warn(`[FloodWait] O Telegram exigiu um período de cooldown. Dormindo por ${waitTime}s.`);
        await new Promise(r => setTimeout(r, waitTime * 1000));
        // Nota: Podemos aplicar uma lógica de retentativa aqui se desejado.
      }
      
      // await db.scrapeJob.update({ where: { id: jobId }, data: { status: "FAILED" } });
    } finally {
      this.isRunning = false;
    }
  }
}

export const telegramWorker = TelegramService.getInstance();
