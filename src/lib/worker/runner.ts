import { db } from "../db";
import { telegramWorker } from "./TelegramService";

// Constantes
const POLL_INTERVAL_MS = 5000;

async function processPendingJobs() {
  try {
    // 1. Buscar o primeiro job PENDING
    const job = await db.scrapeJob.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });

    if (!job) {
      return; // Nenhum job pendente
    }

    console.log(`[Worker Runner] Job encontrado: ${job.id}. Iniciando...`);

    // 2. Atualizar para RUNNING
    await db.scrapeJob.update({
      where: { id: job.id },
      data: { status: "RUNNING" },
    });

    // 3. Buscar a Sessão Ativa (Para iniciar o Telegram)
    // Assume-se que há ao menos uma sessão no BD. Em sistemas multi-tenant isso seria associado ao User/Job.
    const session = await db.session.findFirst();

    if (!session) {
      throw new Error("Nenhuma StringSession encontrada no banco de dados.");
    }

    // 4. Iniciar Client do Telegram
    await telegramWorker.initClient(session.stringSession);

    // 5. Iniciar Extração
    await telegramWorker.startJob(job.id, job.targetId);

    // 6. Finalizar
    await db.scrapeJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED" },
    });
    console.log(`[Worker Runner] Job ${job.id} concluído com sucesso.`);

  } catch (error: any) {
    console.error(`[Worker Runner] Falha na execução do Job:`, error);
    
    // Tratamento de Erro e Atualização do Job
    try {
      // Se tivermos o erro dentro do processamento de um job, falhamos o job especificamente
      // Precisamos inferir o jobId caso erro tenha ocorrido antes (ou mudar estrutura)
      // Como a abstração está simplificada para "um job por vez":
      const runningJob = await db.scrapeJob.findFirst({ where: { status: "RUNNING" } });
      if (runningJob) {
        await db.scrapeJob.update({
          where: { id: runningJob.id },
          data: { status: "FAILED" },
        });
      }
    } catch (dbError) {
      console.error("[Worker Runner] Falha crítica ao atualizar status para FAILED:", dbError);
    }
  }
}

// Iniciar Loop do Daemon
console.log("[Worker Runner] Daemon iniciado. Aguardando jobs...");
setInterval(processPendingJobs, POLL_INTERVAL_MS);
