import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';

const HMS_API_URL = 'https://api.100ms.live/v2';

export function generateManagementToken(appAccessKey: string, appSecret: string): string {
  const payload = {
    access_key: appAccessKey,
    type: 'management',
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

export function gerarTokenParticipante(
  roomId: string,
  userId: string,
  role: string,
  appAccessKey: string,
  appSecret: string
): string {
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

  const response = await axios.post(
    `${HMS_API_URL}/rooms`,
    {
      name: nome,
      description: `Sala de reunião: ${nome}`,
      template_id: templateId,
    },
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
  meetingUrl: string
): Promise<{ id: string; room_id: string; session_id: string; status: string }> {
  const token = generateManagementToken(appAccessKey, appSecret);

  const response = await axios.post(
    `${HMS_API_URL}/recordings/room/${roomId}/start`,
    {
      meeting_url: meetingUrl,
      resolution: { width: 1280, height: 720 },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

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

  try {
    // Tenta primeiro o endpoint padrão
    const response = await axios.get(`${HMS_API_URL}/recording-assets/${assetId}/presigned-url`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error: any) {
    const errorData = error.response?.data;
    console.error(`[HMS] Erro ao obter URL presignada para asset ${assetId}:`, errorData || error.message);
    
    // ESTRATÉGIA DE RECUPERAÇÃO: Se o assetId falhar com 404 ou erro de RemotePath
    try {
      const asset = await obterAssetGravacao(assetId, appAccessKey, appSecret);
      
      // Se o asset existe e tem um path, tenta forçar a geração da URL usando esse path
      if (asset && asset.path) {
        console.log(`[HMS] Tentando recuperação forçada via RemotePath: ${asset.path}`);
        
        // No 100ms API V2, às vezes passar o path como query param ou no body resolve se o assetId der 404
        const retryResponse = await axios.get(`${HMS_API_URL}/recording-assets/${assetId}/presigned-url`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            path: asset.path // Tenta como query param
          }
        });
        return retryResponse.data;
      }
      
      // Se ainda não resolveu, tenta listar todos os assets da sala para ver se há outro ID válido
      if (asset && asset.room_id) {
        console.log(`[HMS] Buscando assets alternativos para a sala ${asset.room_id}`);
        const altAssets = await listarAssetsRecentesSala(asset.room_id, appAccessKey, appSecret);
        const alternative = altAssets.find(a => a.status === 'completed' && a.id !== assetId);
        if (alternative) {
          console.log(`[HMS] Encontrado asset alternativo: ${alternative.id}`);
          const altResponse = await axios.get(`${HMS_API_URL}/recording-assets/${alternative.id}/presigned-url`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          return altResponse.data;
        }
      }
    } catch (innerError: any) {
      console.error(`[HMS] Falha total na recuperação de asset ${assetId}:`, innerError.response?.data || innerError.message);
    }
    
    throw error;
  }
}

export async function obterAssetIdPorRecordingId(
  recordingId: string,
  appAccessKey: string,
  appSecret: string
): Promise<string | null> {
  const token = generateManagementToken(appAccessKey, appSecret);
  try {
    console.log(`[HMS] Buscando assets para recordingId: ${recordingId}`);
    const response = await axios.get(`${HMS_API_URL}/recording-assets`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { recording_id: recordingId }
    });
    
    const assets = response.data?.data;
    if (assets && assets.length > 0) {
      // Prioriza videos (room-composite) sobre outros tipos (chat, etc)
      const videoAsset = assets.find((a: any) => a.status === 'completed' && a.type === 'room-composite');
      const completedAsset = videoAsset || assets.find((a: any) => a.status === 'completed');
      const assetId = completedAsset ? completedAsset.id : assets[0].id;
      console.log(`[HMS] Asset encontrado para recording ${recordingId}: ${assetId} (tipo: ${completedAsset?.type || 'unknown'})`);
      return assetId;
    }
    
    // Fallback: tenta obter via GET /recordings/:id
    const recResponse = await axios.get(`${HMS_API_URL}/recordings/${recordingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const assetId = recResponse.data?.asset_id || recResponse.data?.asset?.id || null;
    console.log(`[HMS] Asset recuperado via recording info para ${recordingId}: ${assetId}`);
    return assetId;
  } catch (error: any) {
    console.error(`[HMS] Erro ao obter assetId por recordingId ${recordingId}:`, error.response?.data || error.message);
    return null;
  }
}

export async function listarAssetsRecentesSala(
  roomId: string,
  appAccessKey: string,
  appSecret: string,
  limit: number = 5
): Promise<any[]> {
  const token = generateManagementToken(appAccessKey, appSecret);
  try {
    const response = await axios.get(`${HMS_API_URL}/recording-assets`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { room_id: roomId, limit },
    });
    return response.data?.data || [];
  } catch (error) {
    console.error(`[HMS] Erro ao listar assets recentes da sala ${roomId}:`, error);
    return [];
  }
}
