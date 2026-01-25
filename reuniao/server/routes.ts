import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { users, tenants, usuariosTenant, reunioes, transcricoes, gravacoes, meetingTypes, meetingBookings, meetingTenantMapping, meetingConfirmationPages, meetingTemplates, hms100msConfig } from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

// ==================== HELPER UTILITIES ====================

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

interface TimeSlot {
  start: string;
  end: string;
}

interface AvailabilityConfig {
  weekdays: number[];
  timeSlots: TimeSlot[];
  timezone: string;
  exceptions?: { date: string; available: boolean; slots?: TimeSlot[] }[];
}

function calculateAvailableSlots(
  availabilityConfig: AvailabilityConfig,
  date: Date,
  duration: number,
  existingBookings: { scheduledTime: string; duration: number }[],
  bufferBefore: number = 0,
  bufferAfter: number = 0
): string[] {
  const dayOfWeek = date.getDay();
  const dateStr = date.toISOString().split('T')[0];

  const exception = availabilityConfig.exceptions?.find(e => e.date === dateStr);
  if (exception && !exception.available) return [];

  if (!availabilityConfig.weekdays.includes(dayOfWeek)) return [];

  const timeSlots = exception?.slots || availabilityConfig.timeSlots;
  const slots: string[] = [];

  for (const slot of timeSlots) {
    const [startHour, startMin] = slot.start.split(':').map(Number);
    const [endHour, endMin] = slot.end.split(':').map(Number);

    let current = startHour * 60 + startMin;
    const end = endHour * 60 + endMin;

    while (current + duration <= end) {
      const hours = Math.floor(current / 60);
      const mins = current % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

      const slotStart = current - bufferBefore;
      const slotEnd = current + duration + bufferAfter;

      const hasConflict = existingBookings.some(booking => {
        const [bh, bm] = booking.scheduledTime.split(':').map(Number);
        const bookingStart = bh * 60 + bm;
        const bookingEnd = bookingStart + booking.duration;
        return (slotStart < bookingEnd && slotEnd > bookingStart);
      });

      if (!hasConflict) {
        slots.push(timeStr);
      }

      current += 15;
    }
  }

  return slots;
}

function generateCalendarLinks(
  title: string,
  description: string,
  startDateTime: Date,
  duration: number,
  location?: string
): { google: string; outlook: string; ics: string } {
  const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

  const formatGoogleDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 15) + 'Z';
  const formatOutlookDate = (d: Date) => d.toISOString();

  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatGoogleDate(startDateTime)}/${formatGoogleDate(endDateTime)}&details=${encodeURIComponent(description || '')}&location=${encodeURIComponent(location || '')}`;

  const outlook = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${formatOutlookDate(startDateTime)}&enddt=${formatOutlookDate(endDateTime)}&body=${encodeURIComponent(description || '')}&location=${encodeURIComponent(location || '')}`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MeetFlow//Meeting Booking//PT',
    'BEGIN:VEVENT',
    `DTSTART:${formatGoogleDate(startDateTime)}`,
    `DTEND:${formatGoogleDate(endDateTime)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description || ''}`,
    `LOCATION:${location || ''}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\n');

  const ics = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

  return { google, outlook, ics };
}
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth, generateToken, autoAuth } from "./middlewares/auth";
import { requireTenant } from "./middlewares/tenant";
import { criarSala, gerarTokenParticipante, desativarSala, iniciarGravacao, pararGravacao, obterGravacao, listarGravacoesSala, obterAssetGravacao, obterUrlPresignadaAsset, generateManagementToken } from "./services/hms100ms";
import { notificarReuniaoAgendada, notificarReuniaoIniciada, notificarReuniaoFinalizada, notificarBookingCriado, notificarBookingCancelado, notificarBookingConfirmado, notificarTranscricaoIniciada, notificarTranscricaoFinalizada } from "./services/n8n";
import { initializeDefaultTenantAndUser } from "./services/init";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use: JPG, PNG, GIF, SVG ou WebP'));
    }
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Initialize default tenant and user on startup
  await initializeDefaultTenantAndUser();

  // Serve uploaded files statically
  app.use('/uploads', (await import('express')).default.static(uploadDir));

  // ==================== FILE UPLOAD ROUTES ====================

  // POST /api/upload/logo - Upload company logo
  app.post("/api/upload/logo", requireAuth, upload.single('logo'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

      return res.json({
        success: true,
        url: fileUrl,
        filename: req.file.filename
      });
    } catch (error) {
      console.error("[Upload] Error:", error);
      return res.status(500).json({ message: "Erro ao fazer upload do arquivo" });
    }
  });

  // ==================== RECORDING ENDPOINTS ====================

  app.post("/api/100ms/recording/start", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { roomId } = req.body;
      if (!roomId) return res.status(400).json({ error: "roomId é obrigatório" });

      console.log(`[Recording] 🎥 Iniciando gravação para sala ${roomId}...`);

      const [reuniao] = await db.select().from(reunioes).where(eq(reunioes.roomId100ms, roomId)).limit(1);
      if (!reuniao) return res.status(404).json({ error: "Reunião não encontrada" });

      console.log("[Recording] 1/4 Gerando token para bot...");
      const appAccessKey = req.tenant!.appAccessKey || process.env.HMS_APP_ACCESS_KEY || process.env.HMS_APP_ID;
      const appSecret = req.tenant!.appSecret || process.env.HMS_APP_SECRET;

      console.log(`[Recording] Usando AccessKey: ${appAccessKey ? 'OK' : 'MISSING'}, Secret: ${appSecret ? 'OK' : 'MISSING'}`);

      if (!appAccessKey || !appSecret) {
        throw new Error("Credenciais do 100ms não configuradas (verifique HMS_APP_ACCESS_KEY e HMS_APP_SECRET)");
      }

      const token = gerarTokenParticipante(
        roomId,
        "beam-" + Date.now(),
        "__internal_recorder",
        appAccessKey,
        appSecret
      );

      const publicUrl = process.env.PUBLIC_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
      const recordingUrl = `${publicUrl}/recording/${roomId}?token=${token}`;
      console.log(`[Recording] 2/4 URL de gravação gerada: ${recordingUrl}`);

      console.log("[Recording] 3/4 Chamando API 100ms Beam...");
      const result = await iniciarGravacao(roomId, appAccessKey, appSecret, recordingUrl);

      console.log("[Recording] 4/4 Salvando no banco...");
      await db.insert(gravacoes).values({
        reuniaoId: reuniao.id,
        tenantId: req.tenant!.id,
        roomId100ms: roomId,
        recordingId100ms: result.id,
        status: "recording",
      });

      console.log("[Recording] ✅ Gravação iniciada com sucesso!");
      res.json({ success: true, recordingId: result.id });
    } catch (error: any) {
      console.error("[Recording] ❌ Erro ao iniciar gravação:", error);
      res.status(500).json({ error: error.message || "Erro interno" });
    }
  });

  app.post("/api/100ms/recording/stop", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { roomId } = req.body;
      if (!roomId) return res.status(400).json({ error: "roomId é obrigatório" });

      console.log(`[Recording] ⏹️ Parando gravação para sala ${roomId}...`);

      const appAccessKey = req.tenant!.appAccessKey || process.env.HMS_APP_ACCESS_KEY;
      const appSecret = req.tenant!.appSecret || process.env.HMS_APP_SECRET;

      if (!appAccessKey || !appSecret) {
        throw new Error("Credenciais do 100ms não configuradas para o tenant");
      }

      const result = await pararGravacao(roomId, appAccessKey, appSecret);

      await db.update(gravacoes)
        .set({ status: "processing", stoppedAt: new Date() })
        .where(and(eq(gravacoes.roomId100ms, roomId), eq(gravacoes.status, "recording")));

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Recording] ❌ Erro ao parar gravação:", error);
      res.status(500).json({ error: error.message || "Erro interno" });
    }
  });

  app.get("/api/100ms/recording/:roomId", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const list = await db.select()
        .from(gravacoes)
        .where(eq(gravacoes.roomId100ms, req.params.roomId))
        .orderBy(desc(gravacoes.createdAt));
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/webhooks/100ms", async (req: Request, res: Response) => {
    try {
      const event = req.body;
      console.log("[Webhook 100ms] Evento recebido:", event.type);

      if (event.type === "beam.recording.success") {
        const { id, asset } = event.data;
        await db.update(gravacoes)
          .set({
            status: "completed",
            fileUrl: asset?.location,
            fileSize: asset?.size,
            duration: asset?.duration,
            updatedAt: new Date()
          })
          .where(eq(gravacoes.recordingId100ms, id));
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Webhook 100ms] Erro:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/100ms/active-recordings", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const active = await db.select()
        .from(gravacoes)
        .where(and(eq(gravacoes.tenantId, req.tenant!.id), eq(gravacoes.status, "recording")));
      res.json(active);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== AUTO LOGIN (No auth required) ====================

  // GET /api/auth/auto-login - Auto login with default user
  app.get("/api/auth/auto-login", async (req: Request, res: Response) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, 'admin@meetflow.local'))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "Usuário padrão não encontrado" });
      }

      const [usuarioTenant] = await db
        .select()
        .from(usuariosTenant)
        .where(eq(usuariosTenant.userId, user.id))
        .limit(1);

      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, usuarioTenant.tenantId))
        .limit(1);

      const token = generateToken({
        id: user.id,
        username: user.username,
        tenantId: usuarioTenant?.tenantId,
        usuarioTenantId: usuarioTenant?.id,
        role: usuarioTenant?.role || 'admin',
      });

      if (req.session) {
        (req.session as any).token = token;
      }

      return res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          nome: usuarioTenant?.nome || 'Administrador',
          email: usuarioTenant?.email,
          role: usuarioTenant?.role,
        },
        tenant: tenant ? {
          id: tenant.id,
          nome: tenant.nome,
          slug: tenant.slug,
        } : null,
      });
    } catch (error) {
      console.error("[Auth] Auto login error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ==================== AUTH ROUTES ====================

  // POST /api/auth/login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      // Find user by username (email)
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, email))
        .limit(1);

      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Find user's tenant association
      const [usuarioTenant] = await db
        .select()
        .from(usuariosTenant)
        .where(eq(usuariosTenant.userId, user.id))
        .limit(1);

      let tenant = null;
      if (usuarioTenant) {
        const [tenantData] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, usuarioTenant.tenantId))
          .limit(1);
        tenant = tenantData;
      }

      // Generate token
      const token = generateToken({
        id: user.id,
        username: user.username,
        tenantId: usuarioTenant?.tenantId,
        usuarioTenantId: usuarioTenant?.id,
        role: usuarioTenant?.role || 'user',
      });

      // Store token in session
      if (req.session) {
        (req.session as any).token = token;
      }

      return res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          nome: usuarioTenant?.nome,
          email: usuarioTenant?.email,
          role: usuarioTenant?.role,
        },
        tenant: tenant ? {
          id: tenant.id,
          nome: tenant.nome,
          slug: tenant.slug,
        } : null,
      });
    } catch (error) {
      console.error("[Auth] Login error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/auth/register
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { nome, email, password, nomeEmpresa, slug } = req.body;

      if (!nome || !email || !password || !nomeEmpresa || !slug) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios" });
      }

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, email))
        .limit(1);

      if (existingUser) {
        return res.status(409).json({ message: "Email já cadastrado" });
      }

      // Check if slug already exists
      const [existingTenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, slug))
        .limit(1);

      if (existingTenant) {
        return res.status(409).json({ message: "Slug já está em uso" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          username: email,
          password: hashedPassword,
        })
        .returning();

      // Create tenant
      const [newTenant] = await db
        .insert(tenants)
        .values({
          nome: nomeEmpresa,
          slug,
          email,
        })
        .returning();

      // Create usuario_tenant association (admin)
      const [newUsuarioTenant] = await db
        .insert(usuariosTenant)
        .values({
          tenantId: newTenant.id,
          userId: newUser.id,
          nome,
          email,
          role: 'admin',
        })
        .returning();

      // Generate token
      const token = generateToken({
        id: newUser.id,
        username: newUser.username,
        tenantId: newTenant.id,
        usuarioTenantId: newUsuarioTenant.id,
        role: 'admin',
      });

      return res.status(201).json({
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          nome,
          email,
          role: 'admin',
        },
        tenant: {
          id: newTenant.id,
          nome: newTenant.nome,
          slug: newTenant.slug,
        },
      });
    } catch (error) {
      console.error("[Auth] Register error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Erro ao fazer logout" });
        }
        res.clearCookie('connect.sid');
        return res.json({ message: "Logout realizado com sucesso" });
      });
    } else {
      return res.json({ message: "Logout realizado com sucesso" });
    }
  });

  // GET /api/auth/me
  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      let usuarioTenant = null;
      let tenant = null;

      if (req.user!.usuarioTenantId) {
        const [ut] = await db
          .select()
          .from(usuariosTenant)
          .where(eq(usuariosTenant.id, req.user!.usuarioTenantId))
          .limit(1);
        usuarioTenant = ut;

        if (usuarioTenant) {
          const [t] = await db
            .select()
            .from(tenants)
            .where(eq(tenants.id, usuarioTenant.tenantId))
            .limit(1);
          tenant = t;
        }
      }

      return res.json({
        user: {
          id: user.id,
          username: user.username,
          nome: usuarioTenant?.nome,
          email: usuarioTenant?.email,
          role: usuarioTenant?.role,
        },
        tenant: tenant ? {
          id: tenant.id,
          nome: tenant.nome,
          slug: tenant.slug,
        } : null,
      });
    } catch (error) {
      console.error("[Auth] Get me error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ==================== TENANT ROUTES ====================

  // GET /api/tenants/me
  app.get("/api/tenants/me", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      return res.json(req.tenant);
    } catch (error) {
      console.error("[Tenant] Get tenant error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PATCH /api/tenants/me
  app.patch("/api/tenants/me", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { configuracoes, token100ms, appAccessKey, appSecret, nome, email, telefone, logoUrl, roomDesignConfig } = req.body;

      const updateData: any = { updatedAt: new Date() };

      if (configuracoes !== undefined) updateData.configuracoes = configuracoes;
      if (token100ms !== undefined) updateData.token100ms = token100ms;
      if (appAccessKey !== undefined) updateData.appAccessKey = appAccessKey;
      if (appSecret !== undefined) updateData.appSecret = appSecret;
      if (nome !== undefined) updateData.nome = nome;
      if (email !== undefined) updateData.email = email;
      if (telefone !== undefined) updateData.telefone = telefone;
      if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
      if (roomDesignConfig !== undefined) updateData.roomDesignConfig = roomDesignConfig;

      const [updatedTenant] = await db
        .update(tenants)
        .set(updateData)
        .where(eq(tenants.id, req.tenant!.id))
        .returning();

      return res.json(updatedTenant);
    } catch (error) {
      console.error("[Tenant] Update tenant error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PATCH /api/tenant/room-design - Update room design config
  app.patch("/api/tenant/room-design", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { roomDesignConfig } = req.body;

      if (!roomDesignConfig) {
        return res.status(400).json({ message: "roomDesignConfig é obrigatório" });
      }

      const [updatedTenant] = await db
        .update(tenants)
        .set({ roomDesignConfig, updatedAt: new Date() })
        .where(eq(tenants.id, req.tenant!.id))
        .returning();

      return res.json(updatedTenant);
    } catch (error) {
      console.error("[Tenant] Update room design error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/tenants/usuarios
  app.get("/api/tenants/usuarios", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const usuarios = await db
        .select()
        .from(usuariosTenant)
        .where(eq(usuariosTenant.tenantId, req.tenant!.id));

      return res.json(usuarios);
    } catch (error) {
      console.error("[Tenant] List users error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/tenants/usuarios
  app.post("/api/tenants/usuarios", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { nome, email, telefone, role, password } = req.body;

      if (!nome || !email) {
        return res.status(400).json({ message: "Nome e email são obrigatórios" });
      }

      // Check if email already exists in tenant
      const [existingUsuario] = await db
        .select()
        .from(usuariosTenant)
        .where(and(
          eq(usuariosTenant.tenantId, req.tenant!.id),
          eq(usuariosTenant.email, email)
        ))
        .limit(1);

      if (existingUsuario) {
        return res.status(409).json({ message: "Email já cadastrado neste tenant" });
      }

      let userId = null;

      // If password provided, create a user account
      if (password) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.username, email))
          .limit(1);

        if (existingUser) {
          userId = existingUser.id;
        } else {
          const hashedPassword = await bcrypt.hash(password, 10);
          const [newUser] = await db
            .insert(users)
            .values({
              username: email,
              password: hashedPassword,
            })
            .returning();
          userId = newUser.id;
        }
      }

      const [newUsuario] = await db
        .insert(usuariosTenant)
        .values({
          tenantId: req.tenant!.id,
          userId,
          nome,
          email,
          telefone,
          role: role || 'user',
        })
        .returning();

      return res.status(201).json(newUsuario);
    } catch (error) {
      console.error("[Tenant] Add user error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ==================== REUNIOES ROUTES ====================

  // GET /api/reunioes
  app.get("/api/reunioes", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { status, data_inicio, data_fim } = req.query;

      let conditions = [eq(reunioes.tenantId, req.tenant!.id)];

      if (status) {
        conditions.push(eq(reunioes.status, status as string));
      }

      if (data_inicio) {
        conditions.push(gte(reunioes.dataInicio, new Date(data_inicio as string)));
      }

      if (data_fim) {
        conditions.push(lte(reunioes.dataInicio, new Date(data_fim as string)));
      }

      const reunioesList = await db
        .select()
        .from(reunioes)
        .where(and(...conditions))
        .orderBy(reunioes.dataInicio);

      return res.json(reunioesList);
    } catch (error) {
      console.error("[Reunioes] List error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/reunioes
  app.post("/api/reunioes", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { titulo, descricao, dataInicio, dataFim, duracao, nome, email, telefone, participantes } = req.body;

      if (!dataInicio || !dataFim) {
        return res.status(400).json({ message: "Data de início e fim são obrigatórias" });
      }

      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);

      // Check availability
      const conflitos = await db
        .select()
        .from(reunioes)
        .where(and(
          eq(reunioes.tenantId, req.tenant!.id),
          eq(reunioes.status, 'agendada'),
          lte(reunioes.dataInicio, fim),
          gte(reunioes.dataFim, inicio)
        ));

      if (conflitos.length > 0) {
        return res.status(409).json({ message: "Já existe uma reunião agendada para este horário" });
      }

      let roomId100ms = null;
      let linkReuniao = null;

      // Create 100ms room if credentials are configured
      if (req.tenant!.appAccessKey && req.tenant!.appSecret) {
        try {
          const templateId = (req.tenant!.configuracoes as any)?.templateId100ms || 'default';
          const sala = await criarSala(
            `reuniao-${Date.now()}`,
            templateId,
            req.tenant!.appAccessKey,
            req.tenant!.appSecret
          );
          roomId100ms = sala.id;
          const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0] || '';
          linkReuniao = domain ? `https://${domain}/reuniao/${req.tenant!.slug}/${sala.id}` : `/reuniao/${req.tenant!.slug}/${sala.id}`;
        } catch (err) {
          console.error("[Reunioes] Error creating 100ms room:", err);
        }
      }

      const [novaReuniao] = await db
        .insert(reunioes)
        .values({
          tenantId: req.tenant!.id,
          usuarioId: req.user!.usuarioTenantId,
          titulo,
          descricao,
          dataInicio: inicio,
          dataFim: fim,
          duracao: duracao || Math.round((fim.getTime() - inicio.getTime()) / 60000),
          nome,
          email,
          telefone,
          participantes: participantes || [],
          roomId100ms,
          linkReuniao,
          status: 'agendada',
        })
        .returning();

      // Notify n8n
      await notificarReuniaoAgendada(novaReuniao);

      return res.status(201).json(novaReuniao);
    } catch (error) {
      console.error("[Reunioes] Create error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/reunioes/verificar-disponibilidade
  app.post("/api/reunioes/verificar-disponibilidade", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { dataInicio, dataFim } = req.body;

      if (!dataInicio || !dataFim) {
        return res.status(400).json({ message: "Data de início e fim são obrigatórias" });
      }

      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);

      const conflitos = await db
        .select()
        .from(reunioes)
        .where(and(
          eq(reunioes.tenantId, req.tenant!.id),
          eq(reunioes.status, 'agendada'),
          lte(reunioes.dataInicio, fim),
          gte(reunioes.dataFim, inicio)
        ));

      return res.json({
        disponivel: conflitos.length === 0,
        conflitos: conflitos.map(r => ({
          id: r.id,
          titulo: r.titulo,
          dataInicio: r.dataInicio,
          dataFim: r.dataFim,
        })),
      });
    } catch (error) {
      console.error("[Reunioes] Check availability error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/reunioes/:id
  app.get("/api/reunioes/:id", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [reuniao] = await db
        .select()
        .from(reunioes)
        .where(and(
          eq(reunioes.id, id),
          eq(reunioes.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!reuniao) {
        return res.status(404).json({ message: "Reunião não encontrada" });
      }

      return res.json(reuniao);
    } catch (error) {
      console.error("[Reunioes] Get error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PATCH /api/reunioes/:id
  app.patch("/api/reunioes/:id", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { titulo, descricao, dataInicio, dataFim, duracao, nome, email, telefone, participantes, status } = req.body;

      const [existingReuniao] = await db
        .select()
        .from(reunioes)
        .where(and(
          eq(reunioes.id, id),
          eq(reunioes.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!existingReuniao) {
        return res.status(404).json({ message: "Reunião não encontrada" });
      }

      const updateData: any = { updatedAt: new Date() };

      if (titulo !== undefined) updateData.titulo = titulo;
      if (descricao !== undefined) updateData.descricao = descricao;
      if (dataInicio !== undefined) updateData.dataInicio = new Date(dataInicio);
      if (dataFim !== undefined) updateData.dataFim = new Date(dataFim);
      if (duracao !== undefined) updateData.duracao = duracao;
      if (nome !== undefined) updateData.nome = nome;
      if (email !== undefined) updateData.email = email;
      if (telefone !== undefined) updateData.telefone = telefone;
      if (participantes !== undefined) updateData.participantes = participantes;
      if (status !== undefined) updateData.status = status;

      const [updatedReuniao] = await db
        .update(reunioes)
        .set(updateData)
        .where(eq(reunioes.id, id))
        .returning();

      return res.json(updatedReuniao);
    } catch (error) {
      console.error("[Reunioes] Update error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/reunioes/:id
  app.delete("/api/reunioes/:id", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [reuniao] = await db
        .select()
        .from(reunioes)
        .where(and(
          eq(reunioes.id, id),
          eq(reunioes.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!reuniao) {
        return res.status(404).json({ message: "Reunião não encontrada" });
      }

      // Disable 100ms room if exists
      if (reuniao.roomId100ms && req.tenant!.appAccessKey && req.tenant!.appSecret) {
        try {
          await desativarSala(reuniao.roomId100ms, req.tenant!.appAccessKey, req.tenant!.appSecret);
        } catch (err) {
          console.error("[Reunioes] Error disabling 100ms room:", err);
        }
      }

      // Update status to cancelled
      const [cancelledReuniao] = await db
        .update(reunioes)
        .set({ status: 'cancelada', updatedAt: new Date() })
        .where(eq(reunioes.id, id))
        .returning();

      // Notify n8n
      await notificarReuniaoFinalizada(cancelledReuniao);

      return res.json({ message: "Reunião cancelada com sucesso", reuniao: cancelledReuniao });
    } catch (error) {
      console.error("[Reunioes] Delete error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/reunioes/:id/token-100ms
  app.get("/api/reunioes/:id/token-100ms", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role } = req.query;

      const [reuniao] = await db
        .select()
        .from(reunioes)
        .where(and(
          eq(reunioes.id, id),
          eq(reunioes.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!reuniao) {
        return res.status(404).json({ message: "Reunião não encontrada" });
      }

      if (!reuniao.roomId100ms) {
        return res.status(400).json({ message: "Reunião não possui sala 100ms configurada" });
      }

      if (!req.tenant!.appAccessKey || !req.tenant!.appSecret) {
        return res.status(400).json({ message: "Credenciais 100ms não configuradas" });
      }

      // Use 'host' role consistently for full permissions
      const token = gerarTokenParticipante(
        reuniao.roomId100ms,
        req.user!.id,
        "host",
        req.tenant!.appAccessKey,
        req.tenant!.appSecret
      );

      return res.json({ token, roomId: reuniao.roomId100ms });
    } catch (error) {
      console.error("[Reunioes] Generate token error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ==================== GRAVACOES (RECORDINGS) ROUTES ====================

  // GET /api/gravacoes - List all recordings for tenant
  app.get("/api/gravacoes", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const list = await db
        .select({
          id: gravacoes.id,
          reuniaoId: gravacoes.reuniaoId,
          tenantId: gravacoes.tenantId,
          roomId100ms: gravacoes.roomId100ms,
          sessionId100ms: gravacoes.sessionId100ms,
          recordingId100ms: gravacoes.recordingId100ms,
          status: gravacoes.status,
          startedAt: gravacoes.startedAt,
          stoppedAt: gravacoes.stoppedAt,
          duration: gravacoes.duration,
          fileUrl: gravacoes.fileUrl,
          fileSize: gravacoes.fileSize,
          thumbnailUrl: gravacoes.thumbnailUrl,
          createdAt: gravacoes.createdAt,
          reuniao: {
            id: reunioes.id,
            titulo: reunioes.titulo,
            nome: reunioes.nome,
            email: reunioes.email,
            dataInicio: reunioes.dataInicio,
            dataFim: reunioes.dataFim,
          }
        })
        .from(gravacoes)
        .leftJoin(reunioes, eq(gravacoes.reuniaoId, reunioes.id))
        .where(eq(gravacoes.tenantId, req.tenant!.id))
        .orderBy(desc(gravacoes.createdAt));

      // Mapear o status 'recording' para ser exibido primeiro
      return res.json(list.sort((a: any, b: any) => {
        if (a.status === 'recording' && b.status !== 'recording') return -1;
        if (a.status !== 'recording' && b.status === 'recording') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }));
    } catch (error) {
      console.error("[Gravacoes] List error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/reunioes/:id/gravacao/iniciar - Start recording for a meeting
  app.post("/api/reunioes/:id/gravacao/iniciar", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [reuniao] = await db
        .select()
        .from(reunioes)
        .where(and(
          eq(reunioes.id, id),
          eq(reunioes.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!reuniao) {
        return res.status(404).json({ message: "Reunião não encontrada" });
      }

      if (!reuniao.roomId100ms) {
        return res.status(400).json({ message: "Reunião não possui sala 100ms configurada" });
      }

      if (!req.tenant!.appAccessKey || !req.tenant!.appSecret) {
        return res.status(400).json({ message: "Credenciais 100ms não configuradas" });
      }

      // Construct meeting URL for browser recording - must be publicly accessible
      // Use REPLIT_DEV_DOMAIN for Replit environment (publicly accessible)
      // or fall back to request host for production
      const replitDomain = process.env.REPLIT_DEV_DOMAIN;
      let meetingUrl: string;

      if (replitDomain) {
        // Replit environment - use the dev domain which is publicly accessible
        // Add autoJoin=true&recording=true to skip lobby and join directly for recording
        meetingUrl = `https://${replitDomain}/reuniao/${req.tenant!.slug}/${reuniao.roomId100ms}?autoJoin=true&recording=true`;
      } else {
        // Production or other environment
        const protocol = req.protocol || 'https';
        const host = req.get('host') || 'localhost:5000';
        meetingUrl = `${protocol}://${host}/reuniao/${req.tenant!.slug}/${reuniao.roomId100ms}?autoJoin=true&recording=true`;
      }
      console.log('[Recording] Starting with meeting URL:', meetingUrl);

      // Start 100ms recording
      const recordingResult = await iniciarGravacao(
        reuniao.roomId100ms,
        req.tenant!.appAccessKey,
        req.tenant!.appSecret,
        meetingUrl
      );

      // Create recording entry in database
      const [novaGravacao] = await db
        .insert(gravacoes)
        .values({
          reuniaoId: reuniao.id,
          tenantId: req.tenant!.id,
          roomId100ms: reuniao.roomId100ms,
          sessionId100ms: recordingResult.session_id,
          recordingId100ms: recordingResult.id,
          status: 'recording',
          startedAt: new Date(),
        })
        .returning();

      return res.status(201).json(novaGravacao);
    } catch (error: any) {
      console.error("[Gravacoes] Start recording error:", error);
      const message = error.response?.data?.message || error.message || "Erro ao iniciar gravação";
      return res.status(500).json({ message });
    }
  });

  // POST /api/reunioes/:id/gravacao/parar - Stop recording for a meeting
  app.post("/api/reunioes/:id/gravacao/parar", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [reuniao] = await db
        .select()
        .from(reunioes)
        .where(and(
          eq(reunioes.id, id),
          eq(reunioes.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!reuniao) {
        return res.status(404).json({ message: "Reunião não encontrada" });
      }

      if (!reuniao.roomId100ms) {
        return res.status(400).json({ message: "Reunião não possui sala 100ms configurada" });
      }

      if (!req.tenant!.appAccessKey || !req.tenant!.appSecret) {
        return res.status(400).json({ message: "Credenciais 100ms não configuradas" });
      }

      // Stop 100ms recording
      const stopResult = await pararGravacao(
        reuniao.roomId100ms,
        req.tenant!.appAccessKey,
        req.tenant!.appSecret
      );

      // Try to get recording asset info from 100ms
      let fileUrl: string | null = null;
      let fileSize: number | null = null;
      let duration: number | null = null;

      // Find the recording entry first
      const [existingGravacao] = await db
        .select()
        .from(gravacoes)
        .where(and(
          eq(gravacoes.roomId100ms, reunioes.roomId100ms),
          sql`gravacoes.status IN ('recording', 'starting', 'started')`
        ))
        .limit(1);

      if (existingGravacao?.recordingId100ms) {
        try {
          // Wait a bit for 100ms to process
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Try to get recording details from 100ms
          const recordingDetails = await obterGravacao(
            existingGravacao.recordingId100ms,
            req.tenant!.appAccessKey,
            req.tenant!.appSecret
          );

          console.log('[Gravacoes] Recording details from 100ms:', recordingDetails);

          if (recordingDetails?.asset?.id) {
            // Try to get presigned URL for the asset
            try {
              const assetUrl = await obterUrlPresignadaAsset(
                recordingDetails.asset.id,
                req.tenant!.appAccessKey,
                req.tenant!.appSecret
              );
              fileUrl = assetUrl.url;
              console.log('[Gravacoes] Got presigned URL:', fileUrl);
            } catch (assetErr) {
              console.log('[Gravacoes] Asset not ready yet, will be fetched later');
            }

            // Get duration and size if available
            duration = recordingDetails.asset?.duration || recordingDetails.duration;
            fileSize = recordingDetails.asset?.size;
          }
        } catch (fetchErr) {
          console.log('[Gravacoes] Could not fetch recording details yet:', fetchErr);
        }
      }

      // Update recording entry in database
      const [updatedGravacao] = await db
        .update(gravacoes)
        .set({
          status: 'completed',
          stoppedAt: new Date(),
          updatedAt: new Date(),
          ...(fileUrl && { fileUrl }),
          ...(fileSize && { fileSize }),
          ...(duration && { duration }),
        })
        .where(and(
          eq(gravacoes.roomId100ms, reunioes.roomId100ms),
          sql`gravacoes.status IN ('recording', 'starting', 'started')`
        ))
        .returning();

      return res.json(updatedGravacao || { message: "Gravação parada com sucesso" });
    } catch (error: any) {
      console.error("[Gravacoes] Stop recording error:", error);
      const message = error.response?.data?.message || error.message || "Erro ao parar gravação";
      return res.status(500).json({ message });
    }
  });

  // GET /api/gravacoes/:id - Get recording details
  app.get("/api/gravacoes/:id", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [gravacao] = await db
        .select()
        .from(gravacoes)
        .where(and(
          eq(gravacoes.id, id),
          eq(gravacoes.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!gravacao) {
        return res.status(404).json({ message: "Gravação não encontrada" });
      }

      return res.json(gravacao);
    } catch (error) {
      console.error("[Gravacoes] Get error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/gravacoes/:id/url - Get presigned URL for recording playback
  app.get("/api/gravacoes/:id/url", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [gravacao] = await db
        .select()
        .from(gravacoes)
        .where(and(
          eq(gravacoes.id, id),
          eq(gravacoes.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!gravacao) {
        return res.status(404).json({ message: "Gravação não encontrada" });
      }

      // If status is failed, return appropriate message
      if (gravacao.status === 'failed') {
        return res.status(400).json({
          message: "A gravação falhou. Isso pode acontecer quando a gravação é muito curta ou não há participantes com vídeo ativo.",
          status: 'failed'
        });
      }

      // If file URL is stored directly, return it
      if (gravacao.fileUrl) {
        return res.json({ url: gravacao.fileUrl });
      }

      // Otherwise try to get presigned URL from 100ms
      if (gravacao.recordingId100ms && req.tenant!.appAccessKey && req.tenant!.appSecret) {
        try {
          // Se a gravação foi inserida manualmente ou não tem asset_id, precisamos buscar os detalhes
          const recordingDetails = await obterGravacao(
            gravacao.recordingId100ms,
            req.tenant!.appAccessKey,
            req.tenant!.appSecret
          );

          console.log('[Gravacoes] Recording details for URL:', JSON.stringify(recordingDetails, null, 2));

          // Se o status for 'starting' ou 'started', ainda não há asset
          if (recordingDetails.status === 'starting' || recordingDetails.status === 'started') {
            return res.status(202).json({
              message: "A gravação ainda está sendo processada pelo 100ms. Tente novamente em 1 minuto.",
              status: 'processing'
            });
          }

          // Verificação se a gravação falhou no 100ms
          if (recordingDetails.status === 'failed') {
            await db
              .update(gravacoes)
              .set({ status: 'failed', updatedAt: new Date() })
              .where(eq(gravacoes.id, id));

            return res.status(400).json({
              message: "A gravação do vídeo falhou no 100ms. Isso geralmente ocorre se a reunião for muito curta ou se não houver participantes com vídeo ativo.",
              status: 'failed'
            });
          }

          // Look for room-composite asset in recording_assets array
          let roomCompositeAsset = null;
          if (recordingDetails.recording_assets && Array.isArray(recordingDetails.recording_assets)) {
            roomCompositeAsset = recordingDetails.recording_assets.find(
              (asset: any) => (asset.type === 'room-composite' || asset.type === 'room-composite-image') && asset.status === 'completed'
            );
          }

          // Check both asset.id, asset_id patterns and recording_assets
          const assetId = roomCompositeAsset?.id || recordingDetails.asset?.id || recordingDetails.asset_id;

          if (assetId) {
            const presignedUrl = await obterUrlPresignadaAsset(
              assetId,
              req.tenant!.appAccessKey,
              req.tenant!.appSecret
            );

            const assetDuration = roomCompositeAsset?.duration || recordingDetails.asset?.duration || recordingDetails.duration;
            const assetSize = roomCompositeAsset?.size || recordingDetails.asset?.size;

            // Update the database with the URL for future requests
            await db
              .update(gravacoes)
              .set({
                fileUrl: presignedUrl.url,
                duration: assetDuration,
                fileSize: assetSize,
                status: 'completed',
                updatedAt: new Date(),
              })
              .where(eq(gravacoes.id, id));

            return res.json({ url: presignedUrl.url });
          }

          // Se chegamos aqui e temos assets com falha, marcamos como falha
          if (recordingDetails.recording_assets && Array.isArray(recordingDetails.recording_assets)) {
            const failedComposite = recordingDetails.recording_assets.find(
              (a: any) => a.type === 'room-composite' && a.status === 'failed'
            );
            if (failedComposite) {
              await db
                .update(gravacoes)
                .set({ status: 'failed', updatedAt: new Date() })
                .where(eq(gravacoes.id, id));

              return res.status(400).json({
                message: "A gravação do vídeo falhou no processamento do 100ms.",
                status: 'failed'
              });
            }
          }

          // Se chegamos aqui e o status geral é 'completed', mas não achamos o asset ainda
          if (recordingDetails.status === 'completed' && !assetId) {
            return res.status(202).json({
              message: "Os arquivos da gravação estão sendo gerados. Tente novamente em alguns segundos.",
              status: 'processing'
            });
          }
        } catch (err) {
          console.error("[Gravacoes] Error getting 100ms presigned URL:", err);
        }
      }

      return res.status(404).json({ message: "URL da gravação não disponível. A gravação pode ainda estar sendo processada." });
    } catch (error) {
      console.error("[Gravacoes] URL error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/gravacoes/:id - Delete recording
  app.delete("/api/gravacoes/:id", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [gravacao] = await db
        .select()
        .from(gravacoes)
        .where(and(
          eq(gravacoes.id, id),
          eq(gravacoes.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!gravacao) {
        return res.status(404).json({ message: "Gravação não encontrada" });
      }

      await db.delete(gravacoes).where(eq(gravacoes.id, id));

      return res.json({ message: "Gravação excluída com sucesso" });
    } catch (error) {
      console.error("[Gravacoes] Delete error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ==================== INSTANT MEETING ====================

  // POST /api/reunioes/instantanea - Create instant meeting (like Google Meet)
  app.post("/api/reunioes/instantanea", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { titulo, duracao } = req.body;

      const now = new Date();
      const tenantConfig = req.tenant?.configuracoes as any;
      const duration = duracao || tenantConfig?.duracao_padrao || 60;
      const endTime = new Date(now.getTime() + duration * 60000);

      let roomId100ms = null;
      let linkReuniao = null;

      // Usar credenciais do tenant se disponíveis, senão usar do ambiente
      const hmsAccessKey = req.tenant?.appAccessKey || process.env.HMS_APP_ACCESS_KEY;
      const hmsAppSecret = req.tenant?.appSecret || process.env.HMS_APP_SECRET;
      const hmsTemplateId = req.tenant?.templateId100ms || (req.tenant?.configuracoes as any)?.templateId100ms || process.env.HMS_TEMPLATE_ID || 'default';

      if (hmsAccessKey && hmsAppSecret) {
        try {
          console.log(`[Reunioes] Criando sala 100ms para ${titulo || 'Reunião Instantânea'}...`);
          const sala = await criarSala(
            `instantanea-${Date.now()}`,
            hmsTemplateId,
            hmsAccessKey,
            hmsAppSecret
          );
          roomId100ms = sala.id;
          const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0] || '';
          linkReuniao = domain ? `https://${domain}/reuniao/${req.tenant!.slug}/${sala.id}` : `/reuniao/${req.tenant!.slug}/${sala.id}`;
          console.log(`[Reunioes] Sala 100ms criada: ${roomId100ms}`);
        } catch (err) {
          console.error("[Reunioes] Error creating 100ms room:", err);
        }
      }

      const [novaReuniao] = await db
        .insert(reunioes)
        .values({
          tenantId: req.tenant!.id,
          usuarioId: req.user!.usuarioTenantId,
          titulo: titulo || 'Reunião Instantânea',
          dataInicio: now,
          dataFim: endTime,
          duracao: duration,
          roomId100ms,
          linkReuniao,
          status: 'em_andamento',
        })
        .returning();

      // Notificar início da reunião
      try {
        await notificarReuniaoIniciada({
          room_id: (roomId100ms || novaReuniao.id) as any,
          nome: (req.user as any)?.nome || 'Administrador',
          email: req.user!.username,
          data_inicio: now.toISOString()
        });
      } catch (n8nError: any) {
        console.warn("[N8N] Erro ao notificar início de reunião:", n8nError.message);
      }

      return res.status(201).json(novaReuniao);
    } catch (error) {
      console.error("[Reunioes] Instant meeting error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ==================== PUBLIC API ROUTES (for n8n/webhooks) ====================

  // POST /api/public/reunioes - Create meeting via public API (for n8n)
  app.post("/api/public/reunioes", async (req: Request, res: Response) => {
    try {
      const { titulo, descricao, dataInicio, dataFim, duracao, nome, email, telefone, participantes, tenantSlug } = req.body;

      if (!dataInicio || !dataFim) {
        return res.status(400).json({ message: "Data de início e fim são obrigatórias" });
      }

      const slug = tenantSlug || 'meetflow';
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, slug))
        .limit(1);

      if (!tenant) {
        return res.status(404).json({ message: "Tenant não encontrado" });
      }

      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);

      let roomId100ms = null;
      let linkReuniao = null;

      if (tenant.appAccessKey && tenant.appSecret) {
        try {
          const templateId = (tenant.configuracoes as any)?.templateId100ms || 'default';
          const sala = await criarSala(
            `reuniao-${Date.now()}`,
            templateId,
            tenant.appAccessKey,
            tenant.appSecret
          );
          roomId100ms = sala.id;
          const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0] || '';
          linkReuniao = domain ? `https://${domain}/reuniao/${tenant.slug}/${sala.id}` : `/reuniao/${tenant.slug}/${sala.id}`;
        } catch (err) {
          console.error("[Public API] Error creating 100ms room:", err);
        }
      }

      const [novaReuniao] = await db
        .insert(reunioes)
        .values({
          tenantId: tenant.id,
          titulo: titulo || 'Reunião via API',
          descricao,
          dataInicio: inicio,
          dataFim: fim,
          duracao: duracao || Math.round((fim.getTime() - inicio.getTime()) / 60000),
          nome,
          email,
          telefone,
          participantes: participantes || [],
          roomId100ms,
          linkReuniao,
          status: 'agendada',
        })
        .returning();

      await notificarReuniaoAgendada(novaReuniao);

      return res.status(201).json({
        success: true,
        reuniao: novaReuniao,
        message: "Reunião criada com sucesso via API"
      });
    } catch (error) {
      console.error("[Public API] Create meeting error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/public/reunioes - List meetings via public API
  app.get("/api/public/reunioes", async (req: Request, res: Response) => {
    try {
      const { tenantSlug, status, data_inicio, data_fim } = req.query;

      const slug = (tenantSlug as string) || 'meetflow';
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, slug))
        .limit(1);

      if (!tenant) {
        return res.status(404).json({ message: "Tenant não encontrado" });
      }

      let conditions = [eq(reunioes.tenantId, tenant.id)];

      if (status) {
        conditions.push(eq(reunioes.status, status as string));
      }

      if (data_inicio) {
        conditions.push(gte(reunioes.dataInicio, new Date(data_inicio as string)));
      }

      if (data_fim) {
        conditions.push(lte(reunioes.dataInicio, new Date(data_fim as string)));
      }

      const reunioesList = await db
        .select()
        .from(reunioes)
        .where(and(...conditions))
        .orderBy(reunioes.dataInicio);

      return res.json(reunioesList);
    } catch (error) {
      console.error("[Public API] List meetings error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ==================== WEBHOOKS ROUTES ====================

  // POST /api/webhooks/reuniao-iniciada
  app.post("/api/webhooks/reuniao-iniciada", async (req: Request, res: Response) => {
    try {
      const { reuniaoId, roomId } = req.body;

      if (!reuniaoId && !roomId) {
        return res.status(400).json({ message: "reuniaoId ou roomId é obrigatório" });
      }

      let reuniao;
      if (reuniaoId) {
        [reuniao] = await db
          .select()
          .from(reunioes)
          .where(eq(reunioes.id, reuniaoId))
          .limit(1);
      } else {
        [reuniao] = await db
          .select()
          .from(reunioes)
          .where(eq(reunioes.roomId100ms, roomId))
          .limit(1);
      }

      if (!reuniao) {
        return res.status(404).json({ message: "Reunião não encontrada" });
      }

      const [updatedReuniao] = await db
        .update(reunioes)
        .set({ status: 'em_andamento', updatedAt: new Date() })
        .where(eq(reunioes.id, reuniao.id))
        .returning();

      await notificarReuniaoIniciada(updatedReuniao);

      return res.json({ message: "Status atualizado com sucesso", reuniao: updatedReuniao });
    } catch (error) {
      console.error("[Webhooks] Reuniao iniciada error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/webhooks/reuniao-finalizada
  app.post("/api/webhooks/reuniao-finalizada", async (req: Request, res: Response) => {
    try {
      const { reuniaoId, roomId, gravacaoUrl, duracao } = req.body;

      if (!reuniaoId && !roomId) {
        return res.status(400).json({ message: "reuniaoId ou roomId é obrigatório" });
      }

      let reuniao;
      if (reuniaoId) {
        [reuniao] = await db
          .select()
          .from(reunioes)
          .where(eq(reunioes.id, reuniaoId))
          .limit(1);
      } else {
        [reuniao] = await db
          .select()
          .from(reunioes)
          .where(eq(reunioes.roomId100ms, roomId))
          .limit(1);
      }

      if (!reuniao) {
        return res.status(404).json({ message: "Reunião não encontrada" });
      }

      const updateData: any = {
        status: 'finalizada',
        updatedAt: new Date(),
      };

      if (gravacaoUrl) updateData.gravacaoUrl = gravacaoUrl;
      if (duracao) updateData.duracao = duracao;

      const [updatedReuniao] = await db
        .update(reunioes)
        .set(updateData)
        .where(eq(reunioes.id, reuniao.id))
        .returning();

      await notificarReuniaoFinalizada(updatedReuniao, gravacaoUrl);

      return res.json({ message: "Reunião finalizada com sucesso", reuniao: updatedReuniao });
    } catch (error) {
      console.error("[Webhooks] Reuniao finalizada error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/webhooks/transcricao-completa
  app.post("/api/webhooks/transcricao-completa", async (req: Request, res: Response) => {
    try {
      const { reuniaoId, roomId, transcricaoCompleta, resumo, topicos, acoes } = req.body;

      if (!reuniaoId && !roomId) {
        return res.status(400).json({ message: "reuniaoId ou roomId é obrigatório" });
      }

      let reuniao;
      if (reuniaoId) {
        [reuniao] = await db
          .select()
          .from(reunioes)
          .where(eq(reunioes.id, reuniaoId))
          .limit(1);
      } else {
        [reuniao] = await db
          .select()
          .from(reunioes)
          .where(eq(reunioes.roomId100ms, roomId))
          .limit(1);
      }

      if (!reuniao) {
        return res.status(404).json({ message: "Reunião não encontrada" });
      }

      const [novaTranscricao] = await db
        .insert(transcricoes)
        .values({
          reuniaoId: reuniao.id,
          tenantId: reuniao.tenantId,
          transcricaoCompleta,
          resumo,
          topicos,
          acoes,
        })
        .returning();

      return res.status(201).json({ message: "Transcrição salva com sucesso", transcricao: novaTranscricao });
    } catch (error) {
      console.error("[Webhooks] Transcricao completa error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ==================== MEETING TYPES ROUTES (Authenticated) ====================

  // GET /api/meeting-types - List meeting types for tenant
  app.get("/api/meeting-types", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const types = await db
        .select()
        .from(meetingTypes)
        .where(eq(meetingTypes.tenantId, req.tenant!.id))
        .orderBy(desc(meetingTypes.createdAt));

      return res.json(types);
    } catch (error) {
      console.error("[MeetingTypes] List error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/meeting-types - Create new meeting type
  app.post("/api/meeting-types", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { title, description, duration, bufferBefore, bufferAfter, availabilityConfig, locationType, locationConfig, welcomeTitle, welcomeMessage, welcomeConfig, bookingFields, designConfig, confirmationPageId } = req.body;

      if (!title) {
        return res.status(400).json({ message: "Título é obrigatório" });
      }

      const slug = generateSlug(title);

      const [newMeetingType] = await db
        .insert(meetingTypes)
        .values({
          tenantId: req.tenant!.id,
          title,
          slug,
          description,
          duration: duration || 30,
          bufferBefore: bufferBefore || 0,
          bufferAfter: bufferAfter || 0,
          availabilityConfig: availabilityConfig || {
            weekdays: [1, 2, 3, 4, 5],
            timeSlots: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }],
            timezone: "America/Sao_Paulo",
            exceptions: []
          },
          locationType: locationType || "video",
          locationConfig: locationConfig || { provider: "100ms", customUrl: "", address: "" },
          welcomeTitle,
          welcomeMessage,
          welcomeConfig,
          bookingFields: bookingFields || [
            { id: "nome", type: "short_text", title: "Nome completo", required: true },
            { id: "email", type: "email", title: "E-mail", required: true },
            { id: "telefone", type: "phone_number", title: "WhatsApp", required: true },
            { id: "motivo", type: "textarea", title: "Motivo da reunião", required: false }
          ],
          designConfig,
          confirmationPageId,
          isPublic: false,
          isActive: true,
        })
        .returning();

      return res.status(201).json(newMeetingType);
    } catch (error) {
      console.error("[MeetingTypes] Create error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/meeting-types/:id - Get single meeting type
  app.get("/api/meeting-types/:id", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [meetingType] = await db
        .select()
        .from(meetingTypes)
        .where(and(
          eq(meetingTypes.id, id),
          eq(meetingTypes.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!meetingType) {
        return res.status(404).json({ message: "Tipo de reunião não encontrado" });
      }

      return res.json(meetingType);
    } catch (error) {
      console.error("[MeetingTypes] Get error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PATCH /api/meeting-types/:id - Update meeting type
  app.patch("/api/meeting-types/:id", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, duration, bufferBefore, bufferAfter, availabilityConfig, locationType, locationConfig, welcomeTitle, welcomeMessage, welcomeConfig, bookingFields, designConfig, confirmationPageId, isActive } = req.body;

      const [existing] = await db
        .select()
        .from(meetingTypes)
        .where(and(
          eq(meetingTypes.id, id),
          eq(meetingTypes.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ message: "Tipo de reunião não encontrado" });
      }

      const updateData: any = { updatedAt: new Date() };

      if (title !== undefined) {
        updateData.title = title;
        updateData.slug = generateSlug(title);
      }
      if (description !== undefined) updateData.description = description;
      if (duration !== undefined) updateData.duration = duration;
      if (bufferBefore !== undefined) updateData.bufferBefore = bufferBefore;
      if (bufferAfter !== undefined) updateData.bufferAfter = bufferAfter;
      if (availabilityConfig !== undefined) updateData.availabilityConfig = availabilityConfig;
      if (locationType !== undefined) updateData.locationType = locationType;
      if (locationConfig !== undefined) updateData.locationConfig = locationConfig;
      if (welcomeTitle !== undefined) updateData.welcomeTitle = welcomeTitle;
      if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;
      if (welcomeConfig !== undefined) updateData.welcomeConfig = welcomeConfig;
      if (bookingFields !== undefined) updateData.bookingFields = bookingFields;
      if (designConfig !== undefined) updateData.designConfig = designConfig;
      if (confirmationPageId !== undefined) updateData.confirmationPageId = confirmationPageId;
      if (isActive !== undefined) updateData.isActive = isActive;

      const [updated] = await db
        .update(meetingTypes)
        .set(updateData)
        .where(eq(meetingTypes.id, id))
        .returning();

      return res.json(updated);
    } catch (error) {
      console.error("[MeetingTypes] Update error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/meeting-types/:id - Delete meeting type
  app.delete("/api/meeting-types/:id", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [existing] = await db
        .select()
        .from(meetingTypes)
        .where(and(
          eq(meetingTypes.id, id),
          eq(meetingTypes.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ message: "Tipo de reunião não encontrado" });
      }

      await db.delete(meetingTenantMapping).where(eq(meetingTenantMapping.meetingTypeId, id));
      await db.delete(meetingTypes).where(eq(meetingTypes.id, id));

      return res.json({ message: "Tipo de reunião excluído com sucesso" });
    } catch (error) {
      console.error("[MeetingTypes] Delete error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PATCH /api/meeting-types/:id/publish - Publish/unpublish meeting type
  app.patch("/api/meeting-types/:id/publish", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isPublic } = req.body;

      const [existing] = await db
        .select()
        .from(meetingTypes)
        .where(and(
          eq(meetingTypes.id, id),
          eq(meetingTypes.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ message: "Tipo de reunião não encontrado" });
      }

      const [updated] = await db
        .update(meetingTypes)
        .set({ isPublic: isPublic !== false, updatedAt: new Date() })
        .where(eq(meetingTypes.id, id))
        .returning();

      if (isPublic !== false) {
        const [existingMapping] = await db
          .select()
          .from(meetingTenantMapping)
          .where(eq(meetingTenantMapping.meetingTypeId, id))
          .limit(1);

        if (existingMapping) {
          await db
            .update(meetingTenantMapping)
            .set({
              isPublic: true,
              slug: updated.slug,
              companySlug: req.tenant!.slug,
              updatedAt: new Date()
            })
            .where(eq(meetingTenantMapping.meetingTypeId, id));
        } else {
          await db
            .insert(meetingTenantMapping)
            .values({
              meetingTypeId: id,
              tenantId: req.tenant!.id,
              slug: updated.slug,
              companySlug: req.tenant!.slug,
              isPublic: true,
            });
        }
      } else {
        await db
          .update(meetingTenantMapping)
          .set({ isPublic: false, updatedAt: new Date() })
          .where(eq(meetingTenantMapping.meetingTypeId, id));
      }

      const publicUrl = isPublic !== false ? `/agendar/${req.tenant!.slug}/${updated.slug}` : null;

      return res.json({ ...updated, publicUrl });
    } catch (error) {
      console.error("[MeetingTypes] Publish error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/meeting-types/:id/duplicate - Duplicate meeting type
  app.post("/api/meeting-types/:id/duplicate", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [existing] = await db
        .select()
        .from(meetingTypes)
        .where(and(
          eq(meetingTypes.id, id),
          eq(meetingTypes.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ message: "Tipo de reunião não encontrado" });
      }

      const newSlug = generateSlug(`${existing.title} Cópia ${Date.now()}`);

      const [duplicated] = await db
        .insert(meetingTypes)
        .values({
          tenantId: req.tenant!.id,
          title: `${existing.title} (Cópia)`,
          slug: newSlug,
          description: existing.description,
          duration: existing.duration,
          bufferBefore: existing.bufferBefore,
          bufferAfter: existing.bufferAfter,
          availabilityConfig: existing.availabilityConfig,
          locationType: existing.locationType,
          locationConfig: existing.locationConfig,
          welcomeTitle: existing.welcomeTitle,
          welcomeMessage: existing.welcomeMessage,
          welcomeConfig: existing.welcomeConfig,
          bookingFields: existing.bookingFields,
          designConfig: existing.designConfig,
          confirmationPageId: existing.confirmationPageId,
          isPublic: false,
          isActive: true,
        })
        .returning();

      return res.status(201).json(duplicated);
    } catch (error) {
      console.error("[MeetingTypes] Duplicate error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ==================== PUBLIC BOOKING ROUTES (No auth required) ====================

  // GET /api/public/agendar/:companySlug/:meetingSlug - Get meeting type by public URL
  app.get("/api/public/agendar/:companySlug/:meetingSlug", async (req: Request, res: Response) => {
    try {
      const { companySlug, meetingSlug } = req.params;

      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, companySlug))
        .limit(1);

      if (!tenant) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }

      const [mapping] = await db
        .select()
        .from(meetingTenantMapping)
        .where(and(
          eq(meetingTenantMapping.companySlug, companySlug),
          eq(meetingTenantMapping.slug, meetingSlug),
          eq(meetingTenantMapping.isPublic, true)
        ))
        .limit(1);

      if (!mapping) {
        return res.status(404).json({ message: "Tipo de reunião não encontrado ou não está público" });
      }

      const [meetingType] = await db
        .select()
        .from(meetingTypes)
        .where(and(
          eq(meetingTypes.id, mapping.meetingTypeId),
          eq(meetingTypes.isActive, true)
        ))
        .limit(1);

      if (!meetingType) {
        return res.status(404).json({ message: "Tipo de reunião não está ativo" });
      }

      let confirmationPage = null;
      if (meetingType.confirmationPageId) {
        const [page] = await db
          .select()
          .from(meetingConfirmationPages)
          .where(eq(meetingConfirmationPages.id, meetingType.confirmationPageId))
          .limit(1);
        confirmationPage = page;
      }

      const availabilityConfig = meetingType.availabilityConfig as AvailabilityConfig;
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const existingBookings = await db
        .select({
          scheduledDate: meetingBookings.scheduledDate,
          scheduledTime: meetingBookings.scheduledTime,
          duration: meetingBookings.duration,
        })
        .from(meetingBookings)
        .where(and(
          eq(meetingBookings.meetingTypeId, meetingType.id),
          gte(meetingBookings.scheduledDateTime, now),
          lte(meetingBookings.scheduledDateTime, thirtyDaysFromNow),
          eq(meetingBookings.status, 'confirmed')
        ));

      const availableDates: { date: string; slots: string[] }[] = [];
      const currentDate = new Date(now);
      currentDate.setHours(0, 0, 0, 0);

      while (currentDate <= thirtyDaysFromNow) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayBookings = existingBookings.filter(b => b.scheduledDate === dateStr);

        const slots = calculateAvailableSlots(
          availabilityConfig,
          currentDate,
          meetingType.duration,
          dayBookings,
          meetingType.bufferBefore || 0,
          meetingType.bufferAfter || 0
        );

        if (slots.length > 0) {
          availableDates.push({ date: dateStr, slots });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return res.json({
        meeting: {
          id: meetingType.id,
          title: meetingType.title,
          description: meetingType.description,
          duration: meetingType.duration,
          availabilityConfig: meetingType.availabilityConfig,
          locationType: meetingType.locationType,
          welcomeTitle: meetingType.welcomeTitle,
          welcomeMessage: meetingType.welcomeMessage,
          welcomeConfig: meetingType.welcomeConfig,
          bookingFields: meetingType.bookingFields,
          designConfig: meetingType.designConfig,
        },
        tenant: {
          id: tenant.id,
          nome: tenant.nome,
          slug: tenant.slug,
          logoUrl: tenant.logoUrl,
        },
        availableDates,
        confirmationPage,
      });
    } catch (error) {
      console.error("[PublicBooking] Get meeting type error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/public/agendar/:companySlug/:meetingSlug/availability - Get available slots
  app.get("/api/public/agendar/:companySlug/:meetingSlug/availability", async (req: Request, res: Response) => {
    try {
      const { companySlug, meetingSlug } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate) {
        return res.status(400).json({ message: "startDate é obrigatório" });
      }

      const [mapping] = await db
        .select()
        .from(meetingTenantMapping)
        .where(and(
          eq(meetingTenantMapping.companySlug, companySlug),
          eq(meetingTenantMapping.slug, meetingSlug),
          eq(meetingTenantMapping.isPublic, true)
        ))
        .limit(1);

      if (!mapping) {
        return res.status(404).json({ message: "Tipo de reunião não encontrado" });
      }

      const [meetingType] = await db
        .select()
        .from(meetingTypes)
        .where(and(
          eq(meetingTypes.id, mapping.meetingTypeId),
          eq(meetingTypes.isActive, true)
        ))
        .limit(1);

      if (!meetingType) {
        return res.status(404).json({ message: "Tipo de reunião não está ativo" });
      }

      const start = new Date(startDate as string);
      const end = endDate ? new Date(endDate as string) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

      const existingBookings = await db
        .select({
          scheduledDate: meetingBookings.scheduledDate,
          scheduledTime: meetingBookings.scheduledTime,
          duration: meetingBookings.duration,
        })
        .from(meetingBookings)
        .where(and(
          eq(meetingBookings.meetingTypeId, meetingType.id),
          gte(meetingBookings.scheduledDateTime, start),
          lte(meetingBookings.scheduledDateTime, end),
          eq(meetingBookings.status, 'confirmed')
        ));

      const availabilityConfig = meetingType.availabilityConfig as AvailabilityConfig;
      const availability: { date: string; slots: string[] }[] = [];

      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayBookings = existingBookings.filter(b => b.scheduledDate === dateStr);

        const slots = calculateAvailableSlots(
          availabilityConfig,
          currentDate,
          meetingType.duration,
          dayBookings,
          meetingType.bufferBefore || 0,
          meetingType.bufferAfter || 0
        );

        if (slots.length > 0) {
          availability.push({ date: dateStr, slots });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return res.json({
        meetingTypeId: meetingType.id,
        duration: meetingType.duration,
        timezone: availabilityConfig.timezone,
        availability,
      });
    } catch (error) {
      console.error("[PublicBooking] Get availability error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/public/agendar/:companySlug/:meetingSlug/slots - Get available slots for specific date
  app.get("/api/public/agendar/:companySlug/:meetingSlug/slots", async (req: Request, res: Response) => {
    try {
      const { companySlug, meetingSlug } = req.params;
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({ message: "date é obrigatório" });
      }

      const [mapping] = await db
        .select()
        .from(meetingTenantMapping)
        .where(and(
          eq(meetingTenantMapping.companySlug, companySlug),
          eq(meetingTenantMapping.slug, meetingSlug),
          eq(meetingTenantMapping.isPublic, true)
        ))
        .limit(1);

      if (!mapping) {
        return res.status(404).json({ message: "Tipo de reunião não encontrado" });
      }

      const [meetingType] = await db
        .select()
        .from(meetingTypes)
        .where(and(
          eq(meetingTypes.id, mapping.meetingTypeId),
          eq(meetingTypes.isActive, true)
        ))
        .limit(1);

      if (!meetingType) {
        return res.status(404).json({ message: "Tipo de reunião não está ativo" });
      }

      const selectedDate = new Date(date as string);
      const dateStr = selectedDate.toISOString().split('T')[0];

      const existingBookings = await db
        .select({
          scheduledDate: meetingBookings.scheduledDate,
          scheduledTime: meetingBookings.scheduledTime,
          duration: meetingBookings.duration,
        })
        .from(meetingBookings)
        .where(and(
          eq(meetingBookings.meetingTypeId, meetingType.id),
          eq(meetingBookings.scheduledDate, dateStr),
          eq(meetingBookings.status, 'confirmed')
        ));

      const availabilityConfig = meetingType.availabilityConfig as AvailabilityConfig;

      const slots = calculateAvailableSlots(
        availabilityConfig,
        selectedDate,
        meetingType.duration,
        existingBookings,
        meetingType.bufferBefore || 0,
        meetingType.bufferAfter || 0
      );

      const timeSlots = slots.map(time => ({ time, available: true }));

      return res.json(timeSlots);
    } catch (error) {
      console.error("[PublicBooking] Get slots error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/public/agendar/:companySlug/:meetingSlug - Create booking via public URL
  app.post("/api/public/agendar/:companySlug/:meetingSlug", async (req: Request, res: Response) => {
    try {
      const { companySlug, meetingSlug } = req.params;
      const { scheduledDate, scheduledTime, answers, timezone } = req.body;

      if (!scheduledDate || !scheduledTime || !answers) {
        return res.status(400).json({ message: "Campos obrigatórios: scheduledDate, scheduledTime, answers" });
      }

      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, companySlug))
        .limit(1);

      if (!tenant) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }

      const [mapping] = await db
        .select()
        .from(meetingTenantMapping)
        .where(and(
          eq(meetingTenantMapping.companySlug, companySlug),
          eq(meetingTenantMapping.slug, meetingSlug),
          eq(meetingTenantMapping.isPublic, true)
        ))
        .limit(1);

      if (!mapping) {
        return res.status(404).json({ message: "Tipo de reunião não encontrado ou não está público" });
      }

      const [meetingType] = await db
        .select()
        .from(meetingTypes)
        .where(and(
          eq(meetingTypes.id, mapping.meetingTypeId),
          eq(meetingTypes.isPublic, true),
          eq(meetingTypes.isActive, true)
        ))
        .limit(1);

      if (!meetingType) {
        return res.status(404).json({ message: "Tipo de reunião não encontrado ou não está disponível" });
      }

      const [hour, minute] = scheduledTime.split(':').map(Number);
      const scheduledDateTime = new Date(scheduledDate);
      scheduledDateTime.setHours(hour, minute, 0, 0);

      const endDateTime = new Date(scheduledDateTime.getTime() + meetingType.duration * 60000);

      const contactName = answers.nome || answers.name || '';
      const contactEmail = answers.email || '';
      const contactPhone = answers.telefone || answers.phone || '';

      let roomId100ms = null;
      let linkReuniao = null;

      if ((meetingType.locationType === 'video' || meetingType.locationType === '100ms') && tenant.appAccessKey && tenant.appSecret) {
        try {
          const templateId = (tenant.configuracoes as any)?.templateId100ms || 'default';
          const sala = await criarSala(
            `booking-${Date.now()}`,
            templateId,
            tenant.appAccessKey,
            tenant.appSecret
          );
          roomId100ms = sala.id;
          const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0] || '';
          linkReuniao = `${domain ? `https://${domain}` : ''}/reuniao/${tenant.slug}/${sala.id}`;
        } catch (err) {
          console.error("[PublicBooking] Error creating 100ms room:", err);
        }
      }

      const [novaReuniao] = await db
        .insert(reunioes)
        .values({
          tenantId: meetingType.tenantId,
          titulo: meetingType.title,
          descricao: meetingType.description || '',
          dataInicio: scheduledDateTime,
          dataFim: endDateTime,
          duracao: meetingType.duration,
          nome: contactName,
          email: contactEmail,
          telefone: contactPhone,
          participantes: [{ nome: contactName, email: contactEmail, telefone: contactPhone }],
          roomId100ms,
          linkReuniao,
          status: 'agendada',
          metadata: { bookingAnswers: answers, meetingTypeId: meetingType.id },
        })
        .returning();

      const calendarLinks = generateCalendarLinks(
        meetingType.title,
        meetingType.description || '',
        scheduledDateTime,
        meetingType.duration,
        linkReuniao || ''
      );

      const [novaBooking] = await db
        .insert(meetingBookings)
        .values({
          tenantId: meetingType.tenantId,
          meetingTypeId: meetingType.id,
          reuniaoId: novaReuniao.id,
          scheduledDate,
          scheduledTime,
          scheduledDateTime,
          duration: meetingType.duration,
          timezone: timezone || 'America/Sao_Paulo',
          status: 'confirmed',
          answers,
          contactName,
          contactEmail,
          contactPhone,
          locationUrl: linkReuniao,
          calendarLink: calendarLinks.google,
          metadata: { calendarLinks },
        })
        .returning();

      await notificarReuniaoAgendada(novaReuniao);
      await notificarBookingCriado(novaBooking, novaReuniao);

      let confirmationPage = null;
      if (meetingType.confirmationPageId) {
        const [page] = await db
          .select()
          .from(meetingConfirmationPages)
          .where(eq(meetingConfirmationPages.id, meetingType.confirmationPageId))
          .limit(1);
        confirmationPage = page;
      }

      return res.status(201).json({
        booking: novaBooking,
        reuniao: {
          id: novaReuniao.id,
          linkReuniao: novaReuniao.linkReuniao,
        },
        calendarLinks,
        confirmationPage,
        company: {
          name: tenant.nome,
          logo: tenant.logoUrl,
        },
      });
    } catch (error) {
      console.error("[PublicBooking] Create booking via slug error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/public/booking/:bookingId/confirmation - Get booking confirmation
  app.get("/api/public/booking/:bookingId/confirmation", async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;

      const [booking] = await db
        .select()
        .from(meetingBookings)
        .where(eq(meetingBookings.id, bookingId))
        .limit(1);

      if (!booking) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }

      let meetingType = null;
      if (booking.meetingTypeId) {
        const [mt] = await db
          .select()
          .from(meetingTypes)
          .where(eq(meetingTypes.id, booking.meetingTypeId))
          .limit(1);
        meetingType = mt;
      }

      let reuniao = null;
      if (booking.reuniaoId) {
        const [r] = await db
          .select()
          .from(reunioes)
          .where(eq(reunioes.id, booking.reuniaoId))
          .limit(1);
        reuniao = r;
      }

      let confirmationPage = null;
      if (meetingType?.confirmationPageId) {
        const [page] = await db
          .select()
          .from(meetingConfirmationPages)
          .where(eq(meetingConfirmationPages.id, meetingType.confirmationPageId))
          .limit(1);
        confirmationPage = page;
      }

      let tenant = null;
      if (booking.tenantId) {
        const [t] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, booking.tenantId))
          .limit(1);
        tenant = t;
      }

      const metadata = booking.metadata as Record<string, any> || {};
      const calendarLinks = metadata.calendarLinks || {};

      return res.json({
        booking: {
          id: booking.id,
          scheduledDate: booking.scheduledDate,
          scheduledTime: booking.scheduledTime,
          duration: booking.duration,
          status: booking.status,
          contactName: booking.contactName,
          contactEmail: booking.contactEmail,
          locationUrl: booking.locationUrl,
        },
        meetingType: meetingType ? {
          id: meetingType.id,
          title: meetingType.title,
          description: meetingType.description,
          duration: meetingType.duration,
          locationType: meetingType.locationType,
          designConfig: meetingType.designConfig,
        } : null,
        reuniao: reuniao ? {
          id: reuniao.id,
          linkReuniao: reuniao.linkReuniao,
        } : null,
        confirmationPage,
        company: tenant ? {
          name: tenant.nome,
          logo: tenant.logoUrl,
        } : null,
        calendarLinks,
      });
    } catch (error) {
      console.error("[PublicBooking] Get confirmation error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/public/bookings - Create a new booking (no auth required)
  app.post("/api/public/bookings", async (req: Request, res: Response) => {
    try {
      const { meetingTypeId, scheduledDate, scheduledTime, answers, timezone } = req.body;

      if (!meetingTypeId || !scheduledDate || !scheduledTime || !answers) {
        return res.status(400).json({ message: "Campos obrigatórios: meetingTypeId, scheduledDate, scheduledTime, answers" });
      }

      const [meetingType] = await db
        .select()
        .from(meetingTypes)
        .where(and(
          eq(meetingTypes.id, meetingTypeId),
          eq(meetingTypes.isPublic, true),
          eq(meetingTypes.isActive, true)
        ))
        .limit(1);

      if (!meetingType) {
        return res.status(404).json({ message: "Tipo de reunião não encontrado ou não está disponível" });
      }

      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, meetingType.tenantId))
        .limit(1);

      if (!tenant) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }

      const [hour, minute] = scheduledTime.split(':').map(Number);
      const scheduledDateTime = new Date(scheduledDate);
      scheduledDateTime.setHours(hour, minute, 0, 0);

      const endDateTime = new Date(scheduledDateTime.getTime() + meetingType.duration * 60000);

      const contactName = answers.nome || answers.name || '';
      const contactEmail = answers.email || '';
      const contactPhone = answers.telefone || answers.phone || '';

      let roomId100ms = null;
      let linkReuniao = null;

      if (meetingType.locationType === 'video' && tenant.appAccessKey && tenant.appSecret) {
        try {
          const templateId = (tenant.configuracoes as any)?.templateId100ms || 'default';
          const sala = await criarSala(
            `booking-${Date.now()}`,
            templateId,
            tenant.appAccessKey,
            tenant.appSecret
          );
          roomId100ms = sala.id;
          const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0] || '';
          linkReuniao = `${domain ? `https://${domain}` : ''}/reuniao/${sala.id}`;
        } catch (err) {
          console.error("[PublicBooking] Error creating 100ms room:", err);
        }
      }

      const [novaReuniao] = await db
        .insert(reunioes)
        .values({
          tenantId: meetingType.tenantId,
          titulo: meetingType.title,
          descricao: meetingType.description || '',
          dataInicio: scheduledDateTime,
          dataFim: endDateTime,
          duracao: meetingType.duration,
          nome: contactName,
          email: contactEmail,
          telefone: contactPhone,
          participantes: [{ nome: contactName, email: contactEmail, telefone: contactPhone }],
          roomId100ms,
          linkReuniao,
          status: 'agendada',
          metadata: { bookingAnswers: answers, meetingTypeId },
        })
        .returning();

      const calendarLinks = generateCalendarLinks(
        meetingType.title,
        meetingType.description || '',
        scheduledDateTime,
        meetingType.duration,
        linkReuniao || ''
      );

      const [novaBooking] = await db
        .insert(meetingBookings)
        .values({
          tenantId: meetingType.tenantId,
          meetingTypeId,
          reuniaoId: novaReuniao.id,
          scheduledDate,
          scheduledTime,
          scheduledDateTime,
          duration: meetingType.duration,
          timezone: timezone || 'America/Sao_Paulo',
          status: 'confirmed',
          answers,
          contactName,
          contactEmail,
          contactPhone,
          locationUrl: linkReuniao,
          calendarLink: calendarLinks.google,
          metadata: { calendarLinks },
        })
        .returning();

      await notificarReuniaoAgendada(novaReuniao);
      await notificarBookingCriado(novaBooking, novaReuniao);

      let confirmationPage = null;
      if (meetingType.confirmationPageId) {
        const [page] = await db
          .select()
          .from(meetingConfirmationPages)
          .where(eq(meetingConfirmationPages.id, meetingType.confirmationPageId))
          .limit(1);
        confirmationPage = page;
      }

      return res.status(201).json({
        booking: novaBooking,
        reuniao: {
          id: novaReuniao.id,
          linkReuniao: novaReuniao.linkReuniao,
        },
        calendarLinks,
        confirmationPage,
        company: {
          name: tenant.nome,
          logo: tenant.logoUrl,
        },
      });
    } catch (error) {
      console.error("[PublicBooking] Create booking error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ==================== BOOKINGS MANAGEMENT ROUTES (Authenticated) ====================

  // GET /api/bookings - List bookings for tenant
  app.get("/api/bookings", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { status, startDate, endDate, meetingTypeId } = req.query;

      let conditions = [eq(meetingBookings.tenantId, req.tenant!.id)];

      if (status) {
        conditions.push(eq(meetingBookings.status, status as string));
      }

      if (startDate) {
        conditions.push(gte(meetingBookings.scheduledDateTime, new Date(startDate as string)));
      }

      if (endDate) {
        conditions.push(lte(meetingBookings.scheduledDateTime, new Date(endDate as string)));
      }

      if (meetingTypeId) {
        conditions.push(eq(meetingBookings.meetingTypeId, meetingTypeId as string));
      }

      const bookings = await db
        .select()
        .from(meetingBookings)
        .where(and(...conditions))
        .orderBy(desc(meetingBookings.scheduledDateTime));

      return res.json(bookings);
    } catch (error) {
      console.error("[Bookings] List error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/bookings/:id - Get single booking
  app.get("/api/bookings/:id", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [booking] = await db
        .select()
        .from(meetingBookings)
        .where(and(
          eq(meetingBookings.id, id),
          eq(meetingBookings.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!booking) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }

      let meetingType = null;
      if (booking.meetingTypeId) {
        const [mt] = await db
          .select()
          .from(meetingTypes)
          .where(eq(meetingTypes.id, booking.meetingTypeId))
          .limit(1);
        meetingType = mt;
      }

      let reuniao = null;
      if (booking.reuniaoId) {
        const [r] = await db
          .select()
          .from(reunioes)
          .where(eq(reunioes.id, booking.reuniaoId))
          .limit(1);
        reuniao = r;
      }

      return res.json({ booking, meetingType, reuniao });
    } catch (error) {
      console.error("[Bookings] Get error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PATCH /api/bookings/:id - Update booking
  app.patch("/api/bookings/:id", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes, cancellationReason } = req.body;

      const [existing] = await db
        .select()
        .from(meetingBookings)
        .where(and(
          eq(meetingBookings.id, id),
          eq(meetingBookings.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }

      const updateData: any = { updatedAt: new Date() };

      if (status !== undefined) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (cancellationReason !== undefined) updateData.cancellationReason = cancellationReason;

      const [updated] = await db
        .update(meetingBookings)
        .set(updateData)
        .where(eq(meetingBookings.id, id))
        .returning();

      if (existing.reuniaoId && status) {
        const reuniaoStatus = status === 'cancelled' ? 'cancelada' : status === 'confirmed' ? 'agendada' : status;
        await db
          .update(reunioes)
          .set({ status: reuniaoStatus, updatedAt: new Date() })
          .where(eq(reunioes.id, existing.reuniaoId));
      }

      return res.json(updated);
    } catch (error) {
      console.error("[Bookings] Update error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PATCH /api/bookings/:id/status - Update booking status
  app.patch("/api/bookings/:id/status", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, cancellationReason } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status é obrigatório" });
      }

      const [existing] = await db
        .select()
        .from(meetingBookings)
        .where(and(
          eq(meetingBookings.id, id),
          eq(meetingBookings.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }

      const updateData: any = { status, updatedAt: new Date() };
      if (cancellationReason) updateData.cancellationReason = cancellationReason;

      const [updated] = await db
        .update(meetingBookings)
        .set(updateData)
        .where(eq(meetingBookings.id, id))
        .returning();

      if (existing.reuniaoId) {
        const reuniaoStatus = status === 'cancelled' ? 'cancelada' : status === 'confirmed' ? 'agendada' : status;
        await db
          .update(reunioes)
          .set({ status: reuniaoStatus, updatedAt: new Date() })
          .where(eq(reunioes.id, existing.reuniaoId));
      }

      if (status === 'confirmed') {
        await notificarBookingConfirmado(updated);
      } else if (status === 'cancelled') {
        await notificarBookingCancelado(updated, cancellationReason);
      }

      return res.json(updated);
    } catch (error) {
      console.error("[Bookings] Update status error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PATCH /api/bookings/:id/cancel - Cancel booking
  app.patch("/api/bookings/:id/cancel", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { cancellationReason } = req.body;

      const [existing] = await db
        .select()
        .from(meetingBookings)
        .where(and(
          eq(meetingBookings.id, id),
          eq(meetingBookings.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }

      const [updated] = await db
        .update(meetingBookings)
        .set({
          status: 'cancelled',
          cancellationReason: cancellationReason || '',
          updatedAt: new Date()
        })
        .where(eq(meetingBookings.id, id))
        .returning();

      if (existing.reuniaoId) {
        await db
          .update(reunioes)
          .set({ status: 'cancelada', updatedAt: new Date() })
          .where(eq(reunioes.id, existing.reuniaoId));
      }

      await notificarBookingCancelado(updated, cancellationReason);

      return res.json(updated);
    } catch (error) {
      console.error("[Bookings] Cancel error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PATCH /api/bookings/:id/notes - Update booking notes
  app.patch("/api/bookings/:id/notes", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const [existing] = await db
        .select()
        .from(meetingBookings)
        .where(and(
          eq(meetingBookings.id, id),
          eq(meetingBookings.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }

      const [updated] = await db
        .update(meetingBookings)
        .set({ notes, updatedAt: new Date() })
        .where(eq(meetingBookings.id, id))
        .returning();

      return res.json(updated);
    } catch (error) {
      console.error("[Bookings] Update notes error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/bookings/:id/confirm - Confirm a booking
  app.post("/api/bookings/:id/confirm", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [existing] = await db
        .select()
        .from(meetingBookings)
        .where(and(
          eq(meetingBookings.id, id),
          eq(meetingBookings.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }

      const [updated] = await db
        .update(meetingBookings)
        .set({ status: 'confirmed', updatedAt: new Date() })
        .where(eq(meetingBookings.id, id))
        .returning();

      if (existing.reuniaoId) {
        await db
          .update(reunioes)
          .set({ status: 'agendada', updatedAt: new Date() })
          .where(eq(reunioes.id, existing.reuniaoId));
      }

      await notificarBookingConfirmado(updated);

      return res.json({ message: "Agendamento confirmado com sucesso", booking: updated });
    } catch (error) {
      console.error("[Bookings] Confirm error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/bookings/:id/cancel - Cancel a booking
  app.post("/api/bookings/:id/cancel", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const [existing] = await db
        .select()
        .from(meetingBookings)
        .where(and(
          eq(meetingBookings.id, id),
          eq(meetingBookings.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }

      const [updated] = await db
        .update(meetingBookings)
        .set({
          status: 'cancelled',
          cancellationReason: reason || '',
          updatedAt: new Date()
        })
        .where(eq(meetingBookings.id, id))
        .returning();

      if (existing.reuniaoId) {
        const [reuniao] = await db
          .select()
          .from(reunioes)
          .where(eq(reunioes.id, existing.reuniaoId))
          .limit(1);

        if (reuniao) {
          await db
            .update(reunioes)
            .set({ status: 'cancelada', updatedAt: new Date() })
            .where(eq(reunioes.id, existing.reuniaoId));

          if (reuniao.roomId100ms && req.tenant!.appAccessKey && req.tenant!.appSecret) {
            try {
              await desativarSala(reuniao.roomId100ms, req.tenant!.appAccessKey, req.tenant!.appSecret);
            } catch (err) {
              console.error("[Bookings] Error disabling 100ms room:", err);
            }
          }

          await notificarReuniaoFinalizada(reuniao);
        }
      }

      await notificarBookingCancelado(updated, reason);

      return res.json({ message: "Agendamento cancelado com sucesso", booking: updated });
    } catch (error) {
      console.error("[Bookings] Cancel error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ==================== PUBLIC MEETING ROOM ROUTES (No auth required) ====================

  // GET /api/public/reuniao/:companySlug/:roomId - Get public meeting room info
  app.get("/api/public/reuniao/:companySlug/:roomId", async (req: Request, res: Response) => {
    try {
      const { companySlug, roomId } = req.params;

      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, companySlug))
        .limit(1);

      if (!tenant) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }

      const [reuniao] = await db
        .select()
        .from(reunioes)
        .where(and(
          eq(reunioes.tenantId, tenant.id),
          eq(reunioes.roomId100ms, roomId)
        ))
        .limit(1);

      if (!reuniao) {
        return res.status(404).json({ message: "Reunião não encontrada" });
      }

      // 🔥 FIX: Buscar roomDesignConfig da tabela hms_100ms_config (onde o design é salvo)
      // em vez de buscar da tabela tenants (que não é atualizada pela página de Design)
      const [hmsConfig] = await db
        .select()
        .from(hms100msConfig)
        .where(eq(hms100msConfig.tenantId, tenant.id))
        .limit(1);

      const defaultRoomDesignConfig = {
        branding: {
          logo: tenant.logoUrl,
          logoSize: 40,
          companyName: tenant.nome,
          showCompanyName: true
        },
        colors: {
          background: '#0f172a',
          controlsBackground: '#18181b',
          controlsText: '#ffffff',
          primaryButton: '#3b82f6',
          dangerButton: '#ef4444',
          avatarBackground: '#3b82f6',
          avatarText: '#ffffff',
          participantNameBackground: 'rgba(0, 0, 0, 0.6)',
          participantNameText: '#ffffff'
        },
        lobby: {
          title: 'Pronto para participar?',
          subtitle: '',
          buttonText: 'Participar agora',
          showDeviceSelectors: true,
          showCameraPreview: true,
          backgroundImage: null
        },
        meeting: {
          showParticipantCount: true,
          showMeetingCode: true,
          showRecordingIndicator: true,
          enableReactions: true,
          enableChat: true,
          enableScreenShare: true,
          enableRaiseHand: true
        },
        endScreen: {
          title: 'Reunião Encerrada',
          message: 'Obrigado por participar!',
          showFeedback: false,
          redirectUrl: null
        }
      };

      // Prioridade: hms_100ms_config > tenant.roomDesignConfig > default
      const roomDesignConfig = (hmsConfig?.roomDesignConfig as any) || tenant.roomDesignConfig || defaultRoomDesignConfig;

      const defaultDesignConfig = {
        colors: {
          primary: "hsl(221, 83%, 53%)",
          secondary: "hsl(210, 40%, 96%)",
          background: "hsl(0, 0%, 100%)",
          text: "hsl(222, 47%, 11%)",
          button: "hsl(221, 19%, 16%)",
          buttonText: "hsl(0, 0%, 100%)"
        },
        typography: {
          fontFamily: "Inter",
          titleSize: "2xl",
          textSize: "base"
        },
        logo: tenant.logoUrl,
        spacing: "comfortable"
      };

      return res.json({
        reuniao: {
          id: reuniao.id,
          titulo: reuniao.titulo,
          descricao: reuniao.descricao,
          dataInicio: reuniao.dataInicio,
          dataFim: reuniao.dataFim,
          duracao: reuniao.duracao,
          status: reuniao.status,
          roomId100ms: reuniao.roomId100ms,
          roomCode100ms: reuniao.roomCode100ms,
          linkReuniao: reuniao.linkReuniao,
          nome: reuniao.nome,
          email: reuniao.email,
        },
        tenant: {
          id: tenant.id,
          nome: tenant.nome,
          slug: tenant.slug,
          logoUrl: tenant.logoUrl,
        },
        designConfig: defaultDesignConfig,
        roomDesignConfig,
      });
    } catch (error) {
      console.error("[PublicMeetingRoom] Get room error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/public/reuniao/:companySlug/:roomId/token - Generate 100ms token for participant
  app.post("/api/public/reuniao/:companySlug/:roomId/token", async (req: Request, res: Response) => {
    try {
      const { companySlug, roomId } = req.params;
      const { name, role } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Nome é obrigatório" });
      }

      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, companySlug))
        .limit(1);

      if (!tenant) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }

      const [reuniao] = await db
        .select()
        .from(reunioes)
        .where(and(
          eq(reunioes.tenantId, tenant.id),
          eq(reunioes.roomId100ms, roomId)
        ))
        .limit(1);

      if (!reuniao) {
        return res.status(404).json({ message: "Reunião não encontrada" });
      }

      // Allow generating tokens for recording/beam roles from public route
      // for the recording bot to work
      const hmsRole = role || "guest";

      const token = gerarTokenParticipante(
        roomId,
        name,
        hmsRole,
        tenant.appAccessKey || process.env.HMS_APP_ACCESS_KEY || '',
        tenant.appSecret || process.env.HMS_APP_SECRET || ''
      );

      return res.json({ token, roomId });
    } catch (error) {
      console.error("[PublicMeetingRoom] Token error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/100ms/get-token - Legacy or internal token generation
  app.post("/api/100ms/get-token", async (req: Request, res: Response) => {
    try {
      const { roomId, name, role, tenantSlug, tenantId } = req.body;

      console.log(`[HMS] Requesting token for room ${roomId}, name ${name}, role ${role}, slug ${tenantSlug}`);

      if (!roomId || !name) {
        return res.status(400).json({ message: "roomId and name are required" });
      }

      let tenant;
      if (tenantSlug) {
        [tenant] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.slug, tenantSlug))
          .limit(1);
      } else if (tenantId) {
        [tenant] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, tenantId))
          .limit(1);
      } else if (req.user?.tenantId) {
        // Fallback para o tenant do usuário logado se nenhum slug/id foi passado
        [tenant] = await db
          .select()
          .from(tenants)
          .where(eq(tenants.id, req.user.tenantId))
          .limit(1);
      }

      if (!tenant) {
        console.error("[HMS] Tenant not found for token request");
        return res.status(404).json({ message: "Tenant not found" });
      }

      if (!tenant.appAccessKey || !tenant.appSecret) {
        console.error("[HMS] Tenant credentials not configured");
        return res.status(400).json({ message: "Credentials not configured" });
      }

      const token = gerarTokenParticipante(
        roomId,
        name,
        role || "guest",
        tenant.appAccessKey || process.env.HMS_APP_ACCESS_KEY || '',
        tenant.appSecret || process.env.HMS_APP_SECRET || ''
      );

      console.log(`[HMS] Token generated successfully for tenant: ${tenant.slug}`);
      return res.json({ token });
    } catch (error) {
      console.error("[100ms] Get token error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // ==================== CONFIRMATION PAGES ROUTES (Authenticated) ====================

  // POST /api/100ms/recording/start - Iniciar gravação via Browser Recording
  app.post("/api/100ms/recording/start", async (req, res) => {
    try {
      const { roomId, meetingUrl, tenantSlug } = req.body;

      if (!roomId || !meetingUrl) {
        return res.status(400).json({ error: "roomId e meetingUrl são obrigatórios" });
      }

      console.log(`[Recording] Iniciando gravação para sala: ${roomId}, URL: ${meetingUrl}`);

      let tenant;
      if (tenantSlug) {
        [tenant] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug)).limit(1);
      } else if (req.user?.tenantId) {
        [tenant] = await db.select().from(tenants).where(eq(tenants.id, req.user.tenantId)).limit(1);
      }

      const managementToken = tenant?.token100ms || process.env.HMS_MANAGEMENT_TOKEN;

      if (!managementToken) {
        return res.status(401).json({ error: "Management token não configurado para o tenant" });
      }

      // SEMPRE gerar um novo token para evitar expiração se tivermos as chaves
      let tokenToUse = managementToken;
      if (tenant?.appAccessKey && tenant?.appSecret) {
        console.log(`[Recording] Gerando novo token de management para o tenant: ${tenant.slug}`);
        tokenToUse = generateManagementToken(tenant.appAccessKey, tenant.appSecret);
      } else if (process.env.HMS_APP_ACCESS_KEY && process.env.HMS_APP_SECRET) {
        console.log("[Recording] Gerando novo token de management usando variáveis de ambiente...");
        tokenToUse = generateManagementToken(process.env.HMS_APP_ACCESS_KEY as string, process.env.HMS_APP_SECRET as string);
      }

      console.log(`[Recording] Usando token (final 10 chars): ${tokenToUse?.substring(tokenToUse.length - 10)}`);

      const response = await fetch(
        `https://api.100ms.live/v2/recordings/room/${roomId}/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenToUse}`,
          },
          body: JSON.stringify({
            meeting_url: meetingUrl,
            resolution: {
              width: 1280,
              height: 720,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[100ms API Error] ${response.status}: ${errorText}`);
        throw new Error(`Erro 100ms: ${errorText}`);
      }

      const data = await response.json();
      console.log('[Recording] Gravação iniciada com sucesso:', data);

      // Sincronizar com o banco de dados imediatamente
      try {
        const [reuniao] = await db
          .select()
          .from(reunioes)
          .where(eq(reunioes.roomId100ms, roomId))
          .limit(1);

        if (reuniao && tenant) {
          await db.insert(gravacoes).values({
            reuniaoId: reuniao.id,
            tenantId: tenant.id,
            roomId100ms: roomId,
            recordingId100ms: data.id,
            status: 'recording',
            startedAt: new Date(),
          });
          console.log('[Recording] Registro de gravação criado no banco');
        }
      } catch (dbErr) {
        console.error('[Recording] Erro ao salvar no banco:', dbErr);
      }

      return res.json({
        success: true,
        recordingId: data.id,
        message: "Gravação iniciada com sucesso",
      });
    } catch (error: any) {
      console.error("[Recording] Erro ao iniciar:", error);
      return res.status(500).json({
        error: "Erro ao iniciar gravação",
        message: error.message,
      });
    }
  });

  // POST /api/100ms/recording/stop - Parar gravação
  app.post("/api/100ms/recording/stop", async (req, res) => {
    try {
      const { roomId, tenantSlug } = req.body;

      if (!roomId) {
        return res.status(400).json({ error: "roomId é obrigatório" });
      }

      console.log(`[Recording] Parando gravação para sala: ${roomId}`);

      let tenant;
      if (tenantSlug) {
        [tenant] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug)).limit(1);
      } else if (req.user?.tenantId) {
        [tenant] = await db.select().from(tenants).where(eq(tenants.id, req.user.tenantId)).limit(1);
      } else {
        // Fallback para o tenant padrão se não houver slug nem usuário (caso público)
        const pathParts = req.headers.referer?.split('/') || [];
        const reuniaoIdx = pathParts.indexOf('reuniao');
        const slugFromUrl = reuniaoIdx !== -1 ? pathParts[reuniaoIdx + 1] : 'meetflow';
        [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slugFromUrl)).limit(1);
      }

      // SEMPRE gerar um novo token para evitar expiração
      let tokenToUse = tenant?.token100ms || process.env.HMS_MANAGEMENT_TOKEN;
      if (tenant?.appAccessKey && tenant?.appSecret) {
        tokenToUse = generateManagementToken(tenant.appAccessKey, tenant.appSecret);
      } else if (process.env.HMS_APP_ACCESS_KEY && process.env.HMS_APP_SECRET) {
        tokenToUse = generateManagementToken(process.env.HMS_APP_ACCESS_KEY as string, process.env.HMS_APP_SECRET as string);
      }

      console.log(`[Recording Stop] Usando token (final 10 chars): ${tokenToUse?.substring(tokenToUse?.length - 10)}`);

      if (!tokenToUse) {
        return res.status(401).json({ error: "Management token não configurado" });
      }

      const response = await fetch(
        `https://api.100ms.live/v2/recordings/room/${roomId}/stop`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenToUse}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[100ms API Error] ${response.status}: ${errorText}`);
        throw new Error(`Erro 100ms: ${errorText}`);
      }

      const data = await response.json();
      console.log('[Recording] Gravação parada com sucesso:', data);

      // ATUALIZAÇÃO CRÍTICA: Marcar como concluído no banco IMEDIATAMENTE
      try {
        await db
          .update(gravacoes)
          .set({
            status: 'completed',
            stoppedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(
            eq(gravacoes.roomId100ms, roomId),
            sql`gravacoes.status IN ('recording', 'starting', 'started')`
          ));
        console.log('[Recording] Status atualizado para concluído no banco');
      } catch (dbErr) {
        console.error('[Recording] Erro ao atualizar status no banco:', dbErr);
      }

      return res.json({
        success: true,
        message: "Gravação parada com sucesso",
      });
    } catch (error: any) {
      console.error("[Recording] Erro ao parar:", error);
      return res.status(500).json({
        error: "Erro ao parar gravação",
        message: error.message,
      });
    }
  });
  app.get("/api/confirmation-pages", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const pages = await db
        .select()
        .from(meetingConfirmationPages)
        .where(eq(meetingConfirmationPages.tenantId, req.tenant!.id))
        .orderBy(desc(meetingConfirmationPages.createdAt));

      return res.json(pages);
    } catch (error) {
      console.error("[ConfirmationPages] List error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/confirmation-pages - Create new confirmation page
  app.post("/api/confirmation-pages", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { name, title, subtitle, confirmationMessage, showDateTime, showLocation, showAddToCalendar, logo, logoAlign, iconColor, iconImage, iconType, ctaText, ctaUrl, customContent, designConfig } = req.body;

      if (!name || !title) {
        return res.status(400).json({ message: "Nome e título são obrigatórios" });
      }

      const [newPage] = await db
        .insert(meetingConfirmationPages)
        .values({
          tenantId: req.tenant!.id,
          name,
          title,
          subtitle,
          confirmationMessage: confirmationMessage || "Você receberá um e-mail com os detalhes.",
          showDateTime: showDateTime ?? true,
          showLocation: showLocation ?? true,
          showAddToCalendar: showAddToCalendar ?? true,
          logo,
          logoAlign: logoAlign || "center",
          iconColor: iconColor || "#22c55e",
          iconImage,
          iconType: iconType || "checkmark",
          ctaText,
          ctaUrl,
          customContent,
          designConfig,
        })
        .returning();

      return res.status(201).json(newPage);
    } catch (error) {
      console.error("[ConfirmationPages] Create error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/confirmation-pages/:id - Get single confirmation page
  app.get("/api/confirmation-pages/:id", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [page] = await db
        .select()
        .from(meetingConfirmationPages)
        .where(and(
          eq(meetingConfirmationPages.id, id),
          eq(meetingConfirmationPages.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!page) {
        return res.status(404).json({ message: "Página de confirmação não encontrada" });
      }

      return res.json(page);
    } catch (error) {
      console.error("[ConfirmationPages] Get error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PATCH /api/confirmation-pages/:id - Update confirmation page
  app.patch("/api/confirmation-pages/:id", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, title, subtitle, confirmationMessage, showDateTime, showLocation, showAddToCalendar, logo, logoAlign, iconColor, iconImage, iconType, ctaText, ctaUrl, customContent, designConfig } = req.body;

      const [existing] = await db
        .select()
        .from(meetingConfirmationPages)
        .where(and(
          eq(meetingConfirmationPages.id, id),
          eq(meetingConfirmationPages.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ message: "Página de confirmação não encontrada" });
      }

      const updateData: any = { updatedAt: new Date() };

      if (name !== undefined) updateData.name = name;
      if (title !== undefined) updateData.title = title;
      if (subtitle !== undefined) updateData.subtitle = subtitle;
      if (confirmationMessage !== undefined) updateData.confirmationMessage = confirmationMessage;
      if (showDateTime !== undefined) updateData.showDateTime = showDateTime;
      if (showLocation !== undefined) updateData.showLocation = showLocation;
      if (showAddToCalendar !== undefined) updateData.showAddToCalendar = showAddToCalendar;
      if (logo !== undefined) updateData.logo = logo;
      if (logoAlign !== undefined) updateData.logoAlign = logoAlign;
      if (iconColor !== undefined) updateData.iconColor = iconColor;
      if (iconImage !== undefined) updateData.iconImage = iconImage;
      if (iconType !== undefined) updateData.iconType = iconType;
      if (ctaText !== undefined) updateData.ctaText = ctaText;
      if (ctaUrl !== undefined) updateData.ctaUrl = ctaUrl;
      if (customContent !== undefined) updateData.customContent = customContent;
      if (designConfig !== undefined) updateData.designConfig = designConfig;

      const [updated] = await db
        .update(meetingConfirmationPages)
        .set(updateData)
        .where(eq(meetingConfirmationPages.id, id))
        .returning();

      return res.json(updated);
    } catch (error) {
      console.error("[ConfirmationPages] Update error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/confirmation-pages/:id - Delete confirmation page
  app.delete("/api/confirmation-pages/:id", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [existing] = await db
        .select()
        .from(meetingConfirmationPages)
        .where(and(
          eq(meetingConfirmationPages.id, id),
          eq(meetingConfirmationPages.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ message: "Página de confirmação não encontrada" });
      }

      await db.delete(meetingConfirmationPages).where(eq(meetingConfirmationPages.id, id));

      return res.json({ message: "Página de confirmação excluída com sucesso" });
    } catch (error) {
      console.error("[ConfirmationPages] Delete error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ==================== MEETING TEMPLATES ROUTES (Authenticated) ====================

  // GET /api/meeting-templates - List meeting templates for tenant
  app.get("/api/meeting-templates", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const templates = await db
        .select()
        .from(meetingTemplates)
        .where(eq(meetingTemplates.tenantId, req.tenant!.id))
        .orderBy(desc(meetingTemplates.createdAt));

      return res.json(templates);
    } catch (error) {
      console.error("[MeetingTemplates] List error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/meeting-templates - Create new meeting template
  app.post("/api/meeting-templates", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { name, description, category, duration, availabilityConfig, locationType, locationConfig, bookingFields, designConfig, welcomeTitle, welcomeMessage } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Nome é obrigatório" });
      }

      const [newTemplate] = await db
        .insert(meetingTemplates)
        .values({
          tenantId: req.tenant!.id,
          name,
          description,
          duration: duration || 30,
          availabilityConfig: availabilityConfig || {
            weekdays: [1, 2, 3, 4, 5],
            timeSlots: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }],
            timezone: "America/Sao_Paulo",
            exceptions: []
          },
          bookingFields: bookingFields || [
            { id: "nome", type: "short_text", title: "Nome completo", required: true },
            { id: "email", type: "email", title: "E-mail", required: true },
            { id: "telefone", type: "phone_number", title: "WhatsApp", required: true }
          ],
          designConfig: designConfig || {
            colors: { primary: "#3b82f6", secondary: "#f1f5f9", background: "#ffffff", text: "#1e293b" },
            typography: { fontFamily: "Inter", titleSize: "2xl", textSize: "base" },
            spacing: "comfortable"
          },
        })
        .returning();

      return res.status(201).json(newTemplate);
    } catch (error) {
      console.error("[MeetingTemplates] Create error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/meeting-templates/:id - Get single meeting template
  app.get("/api/meeting-templates/:id", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [template] = await db
        .select()
        .from(meetingTemplates)
        .where(and(
          eq(meetingTemplates.id, id),
          eq(meetingTemplates.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!template) {
        return res.status(404).json({ message: "Template não encontrado" });
      }

      return res.json(template);
    } catch (error) {
      console.error("[MeetingTemplates] Get error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PATCH /api/meeting-templates/:id - Update meeting template
  app.patch("/api/meeting-templates/:id", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, category, duration, availabilityConfig, locationType, locationConfig, bookingFields, designConfig, welcomeTitle, welcomeMessage } = req.body;

      const [existing] = await db
        .select()
        .from(meetingTemplates)
        .where(and(
          eq(meetingTemplates.id, id),
          eq(meetingTemplates.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ message: "Template não encontrado" });
      }

      const updateData: any = { updatedAt: new Date() };

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (duration !== undefined) updateData.duration = duration;
      if (availabilityConfig !== undefined) updateData.availabilityConfig = availabilityConfig;
      if (locationType !== undefined) updateData.locationType = locationType;
      if (locationConfig !== undefined) updateData.locationConfig = locationConfig;
      if (bookingFields !== undefined) updateData.bookingFields = bookingFields;
      if (designConfig !== undefined) updateData.designConfig = designConfig;
      if (welcomeTitle !== undefined) updateData.welcomeTitle = welcomeTitle;
      if (welcomeMessage !== undefined) updateData.welcomeMessage = welcomeMessage;

      const [updated] = await db
        .update(meetingTemplates)
        .set(updateData)
        .where(eq(meetingTemplates.id, id))
        .returning();

      return res.json(updated);
    } catch (error) {
      console.error("[MeetingTemplates] Update error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // DELETE /api/meeting-templates/:id - Delete meeting template
  app.delete("/api/meeting-templates/:id", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [existing] = await db
        .select()
        .from(meetingTemplates)
        .where(and(
          eq(meetingTemplates.id, id),
          eq(meetingTemplates.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ message: "Template não encontrado" });
      }

      await db.delete(meetingTemplates).where(eq(meetingTemplates.id, id));

      return res.json({ message: "Template excluído com sucesso" });
    } catch (error) {
      console.error("[MeetingTemplates] Delete error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/meeting-templates/from-meeting-type/:meetingTypeId - Create template from meeting type
  app.post("/api/meeting-templates/from-meeting-type/:meetingTypeId", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { meetingTypeId } = req.params;
      const { name } = req.body;

      const [meetingType] = await db
        .select()
        .from(meetingTypes)
        .where(and(
          eq(meetingTypes.id, meetingTypeId),
          eq(meetingTypes.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!meetingType) {
        return res.status(404).json({ message: "Tipo de reunião não encontrado" });
      }

      const [newTemplate] = await db
        .insert(meetingTemplates)
        .values({
          tenantId: req.tenant!.id,
          name: name || `Template: ${meetingType.title}`,
          description: meetingType.description,
          duration: meetingType.duration,
          availabilityConfig: meetingType.availabilityConfig,
          bookingFields: meetingType.bookingFields,
          designConfig: meetingType.designConfig,
        })
        .returning();

      return res.status(201).json(newTemplate);
    } catch (error) {
      console.error("[MeetingTemplates] Create from meeting type error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ==================== TRANSCRIPTION WEBHOOKS ====================

  // Helper function to find active transcription by room ID (pending or transcribing)
  async function findActiveTranscription(roomId: string) {
    const [transcricao] = await db
      .select()
      .from(transcricoes)
      .where(and(
        eq(transcricoes.roomId100ms, roomId),
        sql`${transcricoes.status} IN ('pending', 'transcribing')`
      ))
      .limit(1);
    return transcricao;
  }

  // Helper function to atomically create or get existing transcription
  // Uses partial unique index (transcricoes_active_room_unique) to prevent duplicates
  // Pattern: Create record with 'pending' status first, then update to 'transcribing' after n8n succeeds
  async function createOrGetTranscription(reuniao: any, roomId: string): Promise<{ created: boolean; transcricao: any; isPending?: boolean }> {
    // Check for existing transcription (both pending and transcribing)
    const existing = await findActiveTranscription(roomId);
    if (existing) {
      // If another request is currently processing (pending), let caller know
      return {
        created: false,
        transcricao: existing,
        isPending: existing.status === 'pending'
      };
    }

    try {
      // Try to create new transcription record with 'pending' status
      // Unique partial index will prevent duplicates at DB level
      const [newTranscricao] = await db.insert(transcricoes).values({
        reuniaoId: reuniao.id,
        tenantId: reuniao.tenantId,
        roomId100ms: roomId,
        status: 'pending', // Start as pending until n8n confirms
        startedAt: new Date(),
      }).returning();

      return { created: true, transcricao: newTranscricao };
    } catch (error: any) {
      // Handle unique constraint violation (duplicate key error)
      if (error.code === '23505' || error.message?.includes('unique constraint') || error.message?.includes('duplicate key')) {
        // Race condition: another request created the record, return existing
        const existingAfterConflict = await findActiveTranscription(roomId);
        if (existingAfterConflict) {
          return {
            created: false,
            transcricao: existingAfterConflict,
            isPending: existingAfterConflict.status === 'pending'
          };
        }
      }
      // Re-throw if it's a different error
      throw error;
    }
  }

  // Helper function to update transcription status to 'transcribing' after n8n confirms
  async function activateTranscription(transcricaoId: string): Promise<void> {
    await db.update(transcricoes)
      .set({ status: 'transcribing' })
      .where(eq(transcricoes.id, transcricaoId));
  }

  // Helper function to delete a transcription record (for rollback on n8n failure)
  async function deleteTranscription(transcricaoId: string): Promise<void> {
    await db.delete(transcricoes).where(eq(transcricoes.id, transcricaoId));
  }

  // POST /api/webhooks/iniciar-transcricao - Manual endpoint to start transcription
  app.post("/api/webhooks/iniciar-transcricao", async (req: Request, res: Response) => {
    try {
      const { room_id } = req.body;

      if (!room_id) {
        return res.status(400).json({ error: 'room_id é obrigatório' });
      }

      console.log('[Transcricao] Buscando reunião com room_id:', room_id);

      // Find the meeting by room ID
      const [reuniao] = await db
        .select()
        .from(reunioes)
        .where(eq(reunioes.roomId100ms, room_id))
        .limit(1);

      if (!reuniao) {
        return res.status(404).json({ error: 'Reunião não encontrada' });
      }

      // Step 1: Create or get transcription record FIRST (prevents duplicates via unique index)
      const { created, transcricao } = await createOrGetTranscription(reuniao, room_id);

      if (!created) {
        // Transcription already exists - return success without notifying n8n again
        console.log('[Transcricao] Transcrição já existe:', transcricao.id);
        return res.json({
          success: true,
          message: 'Transcrição já em andamento',
          reuniaoId: reuniao.id,
          transcricaoId: transcricao.id,
        });
      }

      // Step 2: Only the request that created the record notifies n8n
      let n8nResult;
      try {
        n8nResult = await notificarTranscricaoIniciada({
          room_id: room_id,
          nome: reuniao.nome || 'Participante',
          email: reuniao.email || '',
          telefone: reuniao.telefone || undefined,
          data_inicio: reuniao.dataInicio,
        });
      } catch (n8nError: any) {
        // Step 3: Rollback DB on n8n failure
        console.error('[Transcricao] Erro ao notificar n8n, removendo registro:', n8nError);
        await deleteTranscription(transcricao.id);
        return res.status(502).json({
          error: 'Falha ao iniciar transcrição no n8n. Tente novamente.',
          details: n8nError.message,
        });
      }

      // Step 4: Activate transcription after n8n confirms (pending -> transcribing)
      await activateTranscription(transcricao.id);
      console.log('[Transcricao] Transcrição iniciada para reunião:', reuniao.id);

      return res.json({
        success: true,
        message: 'Transcrição iniciada',
        reuniaoId: reuniao.id,
        transcricaoId: transcricao.id,
        n8nResponse: n8nResult,
      });

    } catch (error: any) {
      console.error('[Transcricao] Erro ao iniciar transcrição:', error);
      return res.status(500).json({ error: error.message || 'Erro interno do servidor' });
    }
  });

  // POST /api/webhooks/finalizar-transcricao - Manual endpoint to finalize transcription
  app.post("/api/webhooks/finalizar-transcricao", async (req: Request, res: Response) => {
    try {
      const { room_id } = req.body;

      if (!room_id) {
        return res.status(400).json({ error: 'room_id é obrigatório' });
      }

      console.log('[Transcricao] Finalizando transcrição para room_id:', room_id);

      // Check if there's an active transcription
      const activeTranscription = await findActiveTranscription(room_id);
      if (!activeTranscription) {
        return res.status(409).json({
          error: 'Nenhuma transcrição em andamento para esta sala',
        });
      }

      const dataFim = new Date();

      // Notify n8n to finalize transcription FIRST
      let n8nResult;
      try {
        n8nResult = await notificarTranscricaoFinalizada({
          room_id: room_id,
          data_fim: dataFim,
        });
      } catch (n8nError: any) {
        console.error('[Transcricao] Erro ao notificar n8n:', n8nError);
        return res.status(502).json({
          error: 'Falha ao finalizar transcrição no n8n. Tente novamente.',
          details: n8nError.message,
        });
      }

      // Only update transcription record after n8n success
      await db
        .update(transcricoes)
        .set({
          status: 'completed',
          stoppedAt: dataFim,
          updatedAt: new Date(),
        })
        .where(eq(transcricoes.id, activeTranscription.id));

      console.log('[Transcricao] Transcrição finalizada, documento sendo gerado');

      return res.json({
        success: true,
        message: 'Reunião finalizada, transcrição em processamento',
        transcricaoId: activeTranscription.id,
        n8nResponse: n8nResult,
      });

    } catch (error: any) {
      console.error('[Transcricao] Erro ao finalizar transcrição:', error);
      return res.status(500).json({ error: error.message || 'Erro interno do servidor' });
    }
  });

  // POST /api/webhooks/100ms-events - Receive webhooks from 100ms
  app.post("/api/webhooks/100ms-events", async (req: Request, res: Response) => {
    try {
      const event = req.body;

      console.log('[100ms Webhook] Evento recebido:', event.type);

      // Handle peer.join.success - First participant joined
      if (event.type === 'peer.join.success') {
        const roomId = event.data?.room_id;

        if (!roomId) {
          console.log('[100ms Webhook] room_id não encontrado no evento');
          return res.json({ success: true, message: 'room_id não encontrado' });
        }

        // Find the meeting
        const [reuniao] = await db
          .select()
          .from(reunioes)
          .where(eq(reunioes.roomId100ms, roomId))
          .limit(1);

        if (!reuniao) {
          console.log('[100ms Webhook] Reunião não encontrada para room_id:', roomId);
          return res.json({ success: true, message: 'Reunião não encontrada' });
        }

        // Step 1: Create or get transcription record FIRST (prevents duplicates via unique index)
        const { created, transcricao } = await createOrGetTranscription(reuniao, roomId);

        if (!created) {
          // Transcription already exists - don't notify n8n again
          console.log('[100ms Webhook] Transcrição já existe:', transcricao.id);
        } else {
          // Step 2: Only the request that created the record notifies n8n
          try {
            await notificarTranscricaoIniciada({
              room_id: roomId,
              nome: reuniao.nome || 'Participante',
              email: reuniao.email || '',
              telefone: reuniao.telefone || undefined,
              data_inicio: reuniao.dataInicio,
            });
            // Step 3: Activate transcription after n8n confirms (pending -> transcribing)
            await activateTranscription(transcricao.id);
            console.log('[100ms Webhook] Transcrição iniciada para reunião:', reuniao.id);
          } catch (n8nError: any) {
            // Rollback DB on n8n failure
            console.error('[100ms Webhook] Erro ao notificar n8n, removendo registro:', n8nError);
            await deleteTranscription(transcricao.id);
          }
        }
      }

      // Handle peer.leave.success - Participant left
      if (event.type === 'peer.leave.success') {
        const roomId = event.data?.room_id;

        if (!roomId) {
          return res.json({ success: true });
        }

        // Note: We don't auto-finalize here because we need to check if all participants left
        // This would require an API call to 100ms to check active peers
        // For now, we rely on the manual finalize endpoint
        console.log('[100ms Webhook] Participante saiu da reunião:', roomId);
      }

      // Handle session.close.success - Session ended
      if (event.type === 'session.close.success') {
        const roomId = event.data?.room_id;

        if (roomId) {
          // Check if there's an active transcription
          const activeTranscription = await findActiveTranscription(roomId);

          if (activeTranscription) {
            try {
              const dataFim = new Date();

              // Notify n8n to finalize transcription FIRST
              await notificarTranscricaoFinalizada({
                room_id: roomId,
                data_fim: dataFim,
              });

              // Only update transcription record after n8n success
              await db
                .update(transcricoes)
                .set({
                  status: 'completed',
                  stoppedAt: dataFim,
                  updatedAt: new Date(),
                })
                .where(eq(transcricoes.id, activeTranscription.id));

              console.log('[100ms Webhook] Transcrição finalizada para sessão:', roomId);
            } catch (n8nError: any) {
              console.error('[100ms Webhook] Erro ao notificar n8n (stop):', n8nError);
              // Don't fail the webhook, just log the error
            }
          }
        }
      }

      return res.json({ success: true });

    } catch (error: any) {
      console.error('[100ms Webhook] Erro ao processar evento:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  // POST /api/reunioes/:id/transcricao/iniciar - Start transcription for a specific meeting
  app.post("/api/reunioes/:id/transcricao/iniciar", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [reuniao] = await db
        .select()
        .from(reunioes)
        .where(and(
          eq(reunioes.id, id),
          eq(reunioes.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!reuniao) {
        return res.status(404).json({ message: "Reunião não encontrada" });
      }

      if (!reuniao.roomId100ms) {
        return res.status(400).json({ message: "Reunião não possui sala 100ms configurada. Crie uma reunião com sala de vídeo primeiro." });
      }

      // Step 1: Create or get transcription record FIRST (prevents duplicates via unique index)
      const { created, transcricao } = await createOrGetTranscription(reuniao, reuniao.roomId100ms);

      if (!created) {
        // Transcription already exists - return success without notifying n8n again
        return res.json({
          success: true,
          message: 'Transcrição já em andamento',
          alreadyTranscribing: true,
          transcricaoId: transcricao.id,
        });
      }

      // Step 2: Only the request that created the record notifies n8n
      let n8nResult;
      try {
        n8nResult = await notificarTranscricaoIniciada({
          room_id: reuniao.roomId100ms,
          nome: reuniao.nome || 'Participante',
          email: reuniao.email || '',
          telefone: reuniao.telefone || undefined,
          data_inicio: reuniao.dataInicio,
        });
      } catch (n8nError: any) {
        // Step 3: Rollback DB on n8n failure
        console.error('[Transcricao] Erro ao notificar n8n, removendo registro:', n8nError);
        await deleteTranscription(transcricao.id);
        return res.status(502).json({
          message: 'Falha ao iniciar transcrição no n8n. Tente novamente.',
          details: n8nError.message,
        });
      }

      return res.json({
        success: true,
        message: 'Transcrição iniciada',
        transcricaoId: transcricao.id,
        n8nResponse: n8nResult,
      });

    } catch (error: any) {
      console.error("[Transcricao] Start error:", error);
      return res.status(500).json({ message: error.message || "Erro interno do servidor" });
    }
  });

  // POST /api/reunioes/:id/transcricao/finalizar - Stop transcription for a specific meeting
  app.post("/api/reunioes/:id/transcricao/finalizar", requireAuth, requireTenant, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [reuniao] = await db
        .select()
        .from(reunioes)
        .where(and(
          eq(reunioes.id, id),
          eq(reunioes.tenantId, req.tenant!.id)
        ))
        .limit(1);

      if (!reuniao) {
        return res.status(404).json({ message: "Reunião não encontrada" });
      }

      if (!reuniao.roomId100ms) {
        return res.status(400).json({ message: "Reunião não possui sala 100ms configurada" });
      }

      // Check if transcription was started using transcricoes table
      const activeTranscription = await findActiveTranscription(reuniao.roomId100ms);
      if (!activeTranscription) {
        return res.status(409).json({
          message: 'Nenhuma transcrição em andamento para esta reunião',
          notTranscribing: true,
        });
      }

      const dataFim = new Date();

      // Notify n8n to finalize transcription FIRST
      let n8nResult;
      try {
        n8nResult = await notificarTranscricaoFinalizada({
          room_id: reuniao.roomId100ms,
          data_fim: dataFim,
        });
      } catch (n8nError: any) {
        console.error('[Transcricao] Erro ao notificar n8n:', n8nError);
        return res.status(502).json({
          message: 'Falha ao finalizar transcrição no n8n. Tente novamente.',
          details: n8nError.message,
        });
      }

      // Only update transcription record after n8n success
      await db
        .update(transcricoes)
        .set({
          status: 'completed',
          stoppedAt: dataFim,
          updatedAt: new Date(),
        })
        .where(eq(transcricoes.id, activeTranscription.id));

      return res.json({
        success: true,
        message: 'Reunião finalizada, transcrição em processamento',
        transcricaoId: activeTranscription.id,
        n8nResponse: n8nResult,
      });

    } catch (error: any) {
      console.error("[Transcricao] Stop error:", error);
      return res.status(500).json({ message: error.message || "Erro interno do servidor" });
    }
  });

  // Endpoint para gerar token de acesso à reunião (público)
  app.post("/api/100ms/get-token", async (req, res) => {
    try {
      const { roomId, role, userId, tenantId } = req.body;

      if (!roomId) {
        return res.status(400).json({ error: "roomId é obrigatório" });
      }

      // Obter credenciais do tenant
      let appAccessKey = process.env.HMS_APP_ACCESS_KEY;
      let appSecret = process.env.HMS_APP_SECRET;

      if (tenantId) {
        const tenant = await db.query.tenants.findFirst({
          where: eq(tenants.id, tenantId),
        });

        if (tenant?.appAccessKey && tenant?.appSecret) {
          appAccessKey = tenant.appAccessKey;
          appSecret = tenant.appSecret;
        }
      }

      if (!appAccessKey || !appSecret) {
        return res.status(400).json({ error: "Credenciais 100ms não configuradas" });
      }

      console.log(`[100ms Token] Gerando token para userId=${userId}, role=${role}, roomId=${roomId}`);

      const token = gerarTokenParticipante(
        roomId,
        userId || `guest-${Date.now()}`,
        "host",
        appAccessKey,
        appSecret
      );

      return res.json({ token });
    } catch (error: any) {
      console.error("[100ms Token] Erro ao gerar token:", error);
      return res.status(500).json({
        error: "Erro ao gerar token de acesso",
        message: error.message,
      });
    }
  });

  return httpServer;
}
