import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';

const HMS_API_URL = 'https://api.100ms.live/v2';

export function generateManagementToken(appAccessKey: string, appSecret: string): string {
  const payload = {
    access_key: appAccessKey,
    type: 'management',
    version: 2,
    iat: Math.floor(Date.now() / 1000) - 60, // 60 seconds buffer for clock skew
    nbf: Math.floor(Date.now() / 1000) - 60,
    exp: Math.floor(Date.now() / 1000) + (1 * 60 * 60), // 1 hour duration
  };

  const token = jwt.sign(payload, appSecret, {
    algorithm: 'HS256',
    jwtid: crypto.randomUUID(),
  });

  return token;
}

export function gerarTokenParticipante(
  roomId: string,
  userId: string,
  role: string,
  appAccessKey: string,
  appSecret: string
): string {
  if (!appSecret) {
    console.error("[HMS] appSecret ausente em gerarTokenParticipante");
    throw new Error("HMS_APP_SECRET is required to sign tokens");
  }
  const payload = {
    access_key: appAccessKey,
    room_id: roomId,
    user_id: userId,
    role: role,
    type: 'app',
    version: 2,
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, appSecret, {
    algorithm: 'HS256',
    expiresIn: '24h',
    jwtid: crypto.randomUUID(),
  });
}

export async function criarSala(
  nome: string,
  templateId: string,
  appAccessKey: string,
  appSecret: string
): Promise<{ id: string; name: string; enabled: boolean }> {
  const token = generateManagementToken(appAccessKey, appSecret);

  // Removendo caracteres especiais e espaços para evitar erro 400 (Invalid body param)
  // A API do 100ms exige que o nome tenha apenas letras, números e hifens.
  const timestamp = Date.now();
  const safeName = `instantanea-${timestamp}`;

  console.log(`[100ms] Criando sala com nome: ${safeName}`);

  const body: any = {
    name: safeName,
    description: `Sala de reunião: ${nome}`,
  };
  if (templateId) {
    body.template_id = templateId;
  }

  const response = await axios.post(
    `${HMS_API_URL}/rooms`,
    body,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

export async function desativarSala(
  roomId: string,
  appAccessKey: string,
  appSecret: string
): Promise<void> {
  const token = generateManagementToken(appAccessKey, appSecret);

  await axios.post(
    `${HMS_API_URL}/rooms/${roomId}`,
    {
      enabled: false,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

export async function obterSala(
  roomId: string,
  appAccessKey: string,
  appSecret: string
): Promise<any> {
  const token = generateManagementToken(appAccessKey, appSecret);

  const response = await axios.get(`${HMS_API_URL}/rooms/${roomId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function listarSalas(
  appAccessKey: string,
  appSecret: string,
  limit: number = 10
): Promise<any[]> {
  const token = generateManagementToken(appAccessKey, appSecret);

  const response = await axios.get(`${HMS_API_URL}/rooms`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      limit,
    },
  });

  return response.data.data || [];
}

export async function iniciarGravacao(
  roomId: string,
  appAccessKey: string,
  appSecret: string,
  meetingUrl?: string
): Promise<{ id: string; room_id: string; session_id: string; status: string }> {
  const token = generateManagementToken(appAccessKey, appSecret);

  console.log(`[100ms] Iniciando gravação SFU (Server-Side) para sala ${roomId}`);
  console.log(`[100ms] Modo: Composite Recording (grava diretamente a sala, sem URL de browser)`);

  const response = await axios.post(
    `${HMS_API_URL}/recordings/room/${roomId}/start`,
    {
      resolution: { width: 1280, height: 720 },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log(`[100ms] Gravação SFU iniciada com sucesso:`, response.data);
  return response.data;
}

export async function pararGravacao(
  roomId: string,
  appAccessKey: string,
  appSecret: string
): Promise<{ id: string; room_id: string; status: string; asset: any }> {
  const token = generateManagementToken(appAccessKey, appSecret);

  const response = await axios.post(
    `${HMS_API_URL}/recordings/room/${roomId}/stop`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

export async function obterGravacao(
  recordingId: string,
  appAccessKey: string,
  appSecret: string
): Promise<any> {
  const token = generateManagementToken(appAccessKey, appSecret);

  const response = await axios.get(`${HMS_API_URL}/recordings/${recordingId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function listarGravacoesSala(
  roomId: string,
  appAccessKey: string,
  appSecret: string
): Promise<any[]> {
  const token = generateManagementToken(appAccessKey, appSecret);

  const response = await axios.get(`${HMS_API_URL}/recordings`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      room_id: roomId,
    },
  });

  return response.data.data || [];
}

export async function obterAssetGravacao(
  assetId: string,
  appAccessKey: string,
  appSecret: string
): Promise<any> {
  const token = generateManagementToken(appAccessKey, appSecret);

  const response = await axios.get(`${HMS_API_URL}/recording-assets/${assetId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function obterUrlPresignadaAsset(
  assetId: string,
  appAccessKey: string,
  appSecret: string
): Promise<{ url: string; expiry: number }> {
  const token = generateManagementToken(appAccessKey, appSecret);

  const response = await axios.get(`${HMS_API_URL}/recording-assets/${assetId}/presigned-url`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}
