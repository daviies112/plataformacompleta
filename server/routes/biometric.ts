import { Router } from 'express';
import { db } from '../db';
import { biometricCredentials } from '../../shared/db-schema.js';
import { eq } from 'drizzle-orm';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server/script/deps';

const router = Router();

const rpName = 'NEXUS Intelligence';
const rpID = process.env.REPLIT_DEV_DOMAIN || 'localhost';
const origin = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : `http://localhost:5000`;

router.post('/register/options', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email é obrigatório' });
    }

    const existingCredentials = await db
      .select()
      .from(biometricCredentials)
      .where(eq(biometricCredentials.userId, email));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: email,
      userName: email,
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials: existingCredentials.map(cred => ({
        id: isoBase64URL.toBuffer(cred.credentialId),
        type: 'public-key',
        transports: cred.transports as AuthenticatorTransport[],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });

    req.session.challenge = options.challenge;
    req.session.email = email;

    res.json({ success: true, options });
  } catch (error) {
    console.error('Erro ao gerar opções de registro:', error);
    res.status(500).json({ success: false, error: 'Erro ao gerar opções de registro' });
  }
});

router.post('/register/verify', async (req, res) => {
  try {
    const { response } = req.body;
    const expectedChallenge = req.session.challenge;
    const email = req.session.email;

    if (!expectedChallenge || !email) {
      return res.status(400).json({ success: false, error: 'Sessão inválida' });
    }

    const verification = await verifyRegistrationResponse({
      response: response as RegistrationResponseJSON,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

      await db.insert(biometricCredentials).values({
        userId: email,
        credentialId: response.id,
        publicKey: isoBase64URL.fromBuffer(credentialPublicKey),
        counter: counter,
        transports: response.response.transports || [],
        deviceName: req.headers['user-agent'] || 'Unknown Device',
      });

      delete req.session.challenge;
      delete req.session.email;

      res.json({ 
        success: true, 
        verified: true,
        message: 'Autenticação biométrica configurada com sucesso!' 
      });
    } else {
      res.json({ success: false, verified: false, error: 'Falha na verificação' });
    }
  } catch (error) {
    console.error('Erro ao verificar registro:', error);
    res.status(500).json({ success: false, error: 'Erro ao verificar registro' });
  }
});

router.post('/authenticate/options', async (req, res) => {
  try {
    const { email } = req.body;

    const userCredentials = await db
      .select()
      .from(biometricCredentials)
      .where(eq(biometricCredentials.userId, email));

    if (userCredentials.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Nenhuma credencial biométrica encontrada' 
      });
    }

    const options = await generateAuthenticationOptions({
      timeout: 60000,
      allowCredentials: userCredentials.map(cred => ({
        id: isoBase64URL.toBuffer(cred.credentialId),
        type: 'public-key',
        transports: cred.transports as AuthenticatorTransport[],
      })),
      userVerification: 'preferred',
      rpID,
    });

    req.session.challenge = options.challenge;
    req.session.email = email;

    res.json({ success: true, options });
  } catch (error) {
    console.error('Erro ao gerar opções de autenticação:', error);
    res.status(500).json({ success: false, error: 'Erro ao gerar opções de autenticação' });
  }
});

router.post('/authenticate/verify', async (req, res) => {
  try {
    const { response } = req.body;
    const expectedChallenge = req.session.challenge;
    const email = req.session.email;

    if (!expectedChallenge || !email) {
      return res.status(400).json({ success: false, error: 'Sessão inválida' });
    }

    const credentialId = response.id;
    
    const [credential] = await db
      .select()
      .from(biometricCredentials)
      .where(eq(biometricCredentials.credentialId, credentialId));

    if (!credential) {
      return res.status(404).json({ success: false, error: 'Credencial não encontrada' });
    }

    const verification = await verifyAuthenticationResponse({
      response: response as AuthenticationResponseJSON,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: isoBase64URL.toBuffer(credential.credentialId),
        credentialPublicKey: isoBase64URL.toBuffer(credential.publicKey),
        counter: credential.counter,
      },
    });

    if (verification.verified) {
      await db
        .update(biometricCredentials)
        .set({ 
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: new Date(),
        })
        .where(eq(biometricCredentials.id, credential.id));

      delete req.session.challenge;
      delete req.session.email;

      res.json({ 
        success: true, 
        verified: true,
        email: credential.userId,
        message: 'Autenticação biométrica bem-sucedida!' 
      });
    } else {
      res.json({ success: false, verified: false, error: 'Falha na autenticação' });
    }
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    res.status(500).json({ success: false, error: 'Erro ao verificar autenticação' });
  }
});

export default router;
