import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

// As chaves de API devem vir do ambiente
const apiId = parseInt(process.env.TELEGRAM_API_ID || "0");
const apiHash = process.env.TELEGRAM_API_HASH || "";

// Cache local em memória (ideal apenas para desenvolvimento ou servidores Node stateful)
// Em produção serverless (Vercel), a sessão precisará ser recriada por request 
// usando a stringSession armazenada nos cookies do usuário.
let activeClient: TelegramClient | null = null;

export async function getTelegramClient(sessionString: string = "") {
  if (activeClient && activeClient.connected) {
    return activeClient;
  }

  const stringSession = new StringSession(sessionString);
  
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  // Conecta caso não esteja conectado
  await client.connect();
  
  activeClient = client;
  return client;
}

export async function sendAuthCode(phoneNumber: string) {
  const client = await getTelegramClient();
  const result = await client.sendCode(
    {
      apiId,
      apiHash,
    },
    phoneNumber
  );
  return result.phoneCodeHash;
}

export async function signInUser(phoneNumber: string, phoneCodeHash: string, phoneCode: string) {
  const client = await getTelegramClient();
  await client.invoke(
    new (require("telegram/tl/api").Api.auth.SignIn)({
      phoneNumber,
      phoneCodeHash,
      phoneCode,
    })
  );
  
  // Salvar essa string e retornar para salvar no cookie/DB
  const sessionString = (client.session as StringSession).save();
  return sessionString;
}
