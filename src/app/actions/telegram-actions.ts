"use server";

import { db } from "@/lib/db";

export async function saveSession(phoneNumber: string, sessionString: string) {
  try {
    const session = await db.session.upsert({
      where: { phoneNumber },
      update: { stringSession: sessionString },
      create: { phoneNumber, stringSession: sessionString },
    });
    return { success: true, sessionId: session.id };
  } catch (error: any) {
    console.error("Erro ao salvar sessão:", error);
    return { success: false, error: error.message };
  }
}

export async function createScrapeJob(targetId: string, includePatterns?: string, excludePatterns?: string) {
  try {
    const filters = JSON.stringify({ includePatterns, excludePatterns });
    const job = await db.scrapeJob.create({
      data: {
        targetId,
        filters,
        status: "PENDING",
      },
    });
    return { success: true, jobId: job.id };
  } catch (error: any) {
    console.error("Erro ao criar ScrapeJob:", error);
    return { success: false, error: error.message };
  }
}

export async function getJobs() {
  try {
    const jobs = await db.scrapeJob.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, jobs };
  } catch (error: any) {
    console.error("Erro ao buscar Jobs:", error);
    return { success: false, error: error.message };
  }
}

export async function getExtractedData(jobId: string) {
  try {
    const data = await db.extractedData.findMany({
      where: { jobId },
      orderBy: { extractedAt: "desc" },
    });
    return { success: true, data };
  } catch (error: any) {
    console.error(`Erro ao buscar dados do Job ${jobId}:`, error);
    return { success: false, error: error.message };
  }
}
