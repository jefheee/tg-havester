"use client";

import { useState, useEffect } from "react";
import { saveSession, createScrapeJob, getJobs, getExtractedData } from "./actions/telegram-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";

export default function Dashboard() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sessionString, setSessionString] = useState("");
  const [targetId, setTargetId] = useState("");
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any[]>([]);

  const fetchJobs = async () => {
    const res = await getJobs();
    if (res.success) {
      setJobs(res.jobs);
    }
  };

  const fetchExtractedData = async (jobId: string) => {
    const res = await getExtractedData(jobId);
    if (res.success) {
      setExtractedData(res.data);
    }
  };

  // Polling para Jobs
  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  // Polling para Extracted Data se houver Job selecionado
  useEffect(() => {
    if (selectedJob) {
      fetchExtractedData(selectedJob);
      const interval = setInterval(() => fetchExtractedData(selectedJob), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedJob]);

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSession(phoneNumber, sessionString);
    alert("Sessão salva com sucesso!");
    setPhoneNumber("");
    setSessionString("");
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    await createScrapeJob(targetId);
    setTargetId("");
    fetchJobs();
  };

  return (
    <div className="container mx-auto p-8 space-y-8 max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight">Telegram Data Harvester</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Seção 1: Configurar Sessão */}
        <Card>
          <CardHeader>
            <CardTitle>Autenticação</CardTitle>
            <CardDescription>
              Cole a StringSession gerada via CLI (<code>npm run generate-session</code>)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSession} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Número de Telefone</Label>
                <Input
                  id="phone"
                  placeholder="+5511999999999"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session">String Session</Label>
                <Input
                  id="session"
                  placeholder="1BJWap1sBu..."
                  value={sessionString}
                  onChange={(e) => setSessionString(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">Salvar Sessão</Button>
            </form>
          </CardContent>
        </Card>

        {/* Seção 2: Criar Job */}
        <Card>
          <CardHeader>
            <CardTitle>Nova Extração</CardTitle>
            <CardDescription>
              Insira o ID do Grupo ou Canal (Ex: -100123456789 ou @nomecanal)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateJob} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target">Target ID / Username</Label>
                <Input
                  id="target"
                  placeholder="@telegram"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">Iniciar Coleta em Background</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Seção 3: Jobs e Resultados */}
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Scrape Jobs (Tempo Real)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-xs">{job.targetId}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        job.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                        job.status === "RUNNING" ? "bg-blue-100 text-blue-800 animate-pulse" :
                        job.status === "FAILED" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {job.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setSelectedJob(job.id)}>
                        Ver Dados
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum Job criado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links Extraídos</CardTitle>
            <CardDescription>
              {selectedJob ? `Mostrando resultados do Job selecionado` : "Selecione um Job ao lado"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Msg ID</TableHead>
                    <TableHead>Link Oculto / Válido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extractedData.map((data) => (
                    <TableRow key={data.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{data.messageId}</TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[200px]" title={data.link}>
                        <a href={data.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {data.link}
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedJob && extractedData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">Ainda não há links válidos extraídos.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
