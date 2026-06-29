import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import input from "input";

// Certifique-se de ter configurado TELEGRAM_API_ID e TELEGRAM_API_HASH no .env ou passe antes de rodar
const apiId = parseInt(process.env.TELEGRAM_API_ID || "0", 10);
const apiHash = process.env.TELEGRAM_API_HASH || "";

if (!apiId || !apiHash) {
  console.error("ERRO: TELEGRAM_API_ID e TELEGRAM_API_HASH devem estar definidos no ambiente.");
  process.exit(1);
}

const stringSession = new StringSession("");

(async () => {
  console.log("Iniciando processo de geração de StringSession...");
  
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text("Digite seu número de telefone (com DDI, ex: +5511999999999): "),
    password: async () => await input.text("Digite sua senha (2FA), se houver: "),
    phoneCode: async () => await input.text("Digite o código recebido no Telegram: "),
    onError: (err) => console.log(err),
  });

  console.log("\nAutenticação realizada com sucesso!");
  const session = client.session.save();
  
  console.log("\n==================================================");
  console.log("Sua StringSession: " + (session as unknown as string));
  console.log("==================================================\n");
  
  console.log("Copie a string acima e salve através da interface web do tg-harvester.");
  
  await client.disconnect();
  process.exit(0);
})();
