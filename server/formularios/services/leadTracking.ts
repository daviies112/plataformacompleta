import { db } from '../db.js';
import { leads, formularioSessoes, leadHistorico, formSubmissions, forms } from "../../../shared/db-schema";
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { normalizePhone } from '../utils/phoneNormalizer.js';

export class LeadTrackingService {
  
  async criarSessaoFormulario(
    telefone: string, 
    formularioId: string, 
    diasExpiracao: number = 7
  ) {
    try {
      const telefoneNormalizado = normalizePhone(telefone);
      
      let lead = await db.select()
        .from(leads)
        .where(eq(leads.telefoneNormalizado, telefoneNormalizado))
        .limit(1)
        .then(rows => rows[0] || null);
      
      const agora = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + diasExpiracao);
      
      const token = crypto.randomBytes(32).toString('hex');
      const sessaoId = `sessao_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const formularioUrl = `/formulario/f/${token}`;
      
      if (!lead) {
        const [novoLead] = await db.insert(leads).values({
          telefone: telefone,
          telefoneNormalizado: telefoneNormalizado,
          origem: 'whatsapp',
          formularioId: formularioId,
          formularioEnviado: true,
          formularioEnviadoEm: agora,
          formularioUrl: formularioUrl,
        }).returning();
        lead = novoLead;
      } else {
        const [leadAtualizado] = await db.update(leads)
          .set({
            formularioId: formularioId,
            formularioEnviado: true,
            formularioEnviadoEm: agora,
            formularioUrl: formularioUrl,
            updatedAt: agora,
          })
          .where(eq(leads.id, lead.id))
          .returning();
        lead = leadAtualizado;
      }
      
      const [sessao] = await db.insert(formularioSessoes).values({
        leadId: lead.id,
        token: token,
        sessaoId: sessaoId,
        expiresAt: expiresAt,
        aberto: false,
        totalAcessos: 0,
        progressoPercentual: 0,
        paginaAtual: 1,
        camposPreenchidos: {},
        ipAddresses: [],
        userAgents: [],
      }).returning();
      
      await db.insert(leadHistorico).values({
        leadId: lead.id,
        tipoEvento: 'formulario_enviado',
        descricao: 'Formulário enviado via WhatsApp',
        dados: { formularioId, sessaoId, token, formularioUrl },
      });
      
      console.log(`✅ Sessão criada para ${telefoneNormalizado}: token=${token}`);
      
      return {
        lead,
        sessao,
        url: formularioUrl,
        token,
        expiresAt,
      };
    } catch (error) {
      console.error('❌ Erro ao criar sessão de formulário:', error);
      throw error;
    }
  }
  
  async validarTokenERegistrarAbertura(
    token: string, 
    ip: string, 
    userAgent: string
  ) {
    try {
      const sessao = await db.select()
        .from(formularioSessoes)
        .where(eq(formularioSessoes.token, token))
        .limit(1)
        .then(rows => rows[0] || null);
      
      if (!sessao) {
        return { valido: false, erro: 'Token inválido' };
      }
      
      if (sessao.expiresAt && new Date(sessao.expiresAt) < new Date()) {
        return { valido: false, erro: 'Token expirado' };
      }
      
      if (sessao.concluido) {
        return { valido: false, erro: 'Formulário já concluído' };
      }
      
      const agora = new Date();
      const primeiraAbertura = !sessao.aberto;
      
      const lead = await db.select()
        .from(leads)
        .where(eq(leads.id, sessao.leadId))
        .limit(1)
        .then(rows => rows[0]);
      
      const ipAddresses = Array.isArray(sessao.ipAddresses) ? sessao.ipAddresses : [];
      const userAgents = Array.isArray(sessao.userAgents) ? sessao.userAgents : [];
      
      if (!ipAddresses.includes(ip)) {
        ipAddresses.push(ip);
      }
      if (!userAgents.includes(userAgent)) {
        userAgents.push(userAgent);
      }
      
      if (primeiraAbertura) {
        await db.update(leads)
          .set({
            formularioAberto: true,
            formularioAbertoEm: agora,
            formularioVisualizacoes: 1,
            updatedAt: agora,
          })
          .where(eq(leads.id, sessao.leadId));
        
        await db.update(formularioSessoes)
          .set({
            aberto: true,
            primeiraAberturaEm: agora,
            ultimaAtividadeEm: agora,
            totalAcessos: (sessao.totalAcessos || 0) + 1,
            ipAddresses: ipAddresses,
            userAgents: userAgents,
            updatedAt: agora,
          })
          .where(eq(formularioSessoes.id, sessao.id));
        
        await db.insert(leadHistorico).values({
          leadId: sessao.leadId,
          tipoEvento: 'formulario_aberto',
          descricao: 'Lead abriu o formulário pela primeira vez',
          dados: { ip, userAgent },
          ipAddress: ip,
        });
        
        console.log(`👀 Lead abriu formulário pela primeira vez: ${sessao.sessaoId}`);
      } else {
        const novasVisualizacoes = (lead.formularioVisualizacoes || 1) + 1;
        
        await db.update(leads)
          .set({
            formularioVisualizacoes: novasVisualizacoes,
            updatedAt: agora,
          })
          .where(eq(leads.id, sessao.leadId));
        
        await db.update(formularioSessoes)
          .set({
            ultimaAtividadeEm: agora,
            totalAcessos: (sessao.totalAcessos || 0) + 1,
            ipAddresses: ipAddresses,
            userAgents: userAgents,
            updatedAt: agora,
          })
          .where(eq(formularioSessoes.id, sessao.id));
        
        console.log(`🔄 Lead acessou formulário novamente: ${sessao.sessaoId} (${novasVisualizacoes}x)`);
      }
      
      const leadAtualizado = await db.select()
        .from(leads)
        .where(eq(leads.id, sessao.leadId))
        .limit(1)
        .then(rows => rows[0]);
      
      const sessaoAtualizada = await db.select()
        .from(formularioSessoes)
        .where(eq(formularioSessoes.id, sessao.id))
        .limit(1)
        .then(rows => rows[0]);
      
      return {
        valido: true,
        lead: leadAtualizado,
        sessao: sessaoAtualizada,
        primeiraAbertura,
        dadosPreenchidos: {
          telefone: leadAtualizado.telefoneNormalizado || leadAtualizado.telefone || '',
          nome: leadAtualizado.nome || '',
          email: leadAtualizado.email || '',
        },
      };
    } catch (error) {
      console.error('❌ Erro ao validar token e registrar abertura:', error);
      throw error;
    }
  }
  
  async registrarInicioPreenchimento(
    token: string, 
    campoInicial: string, 
    valor: any
  ) {
    try {
      const sessao = await db.select()
        .from(formularioSessoes)
        .where(eq(formularioSessoes.token, token))
        .limit(1)
        .then(rows => rows[0] || null);
      
      if (!sessao) {
        throw new Error('Sessão não encontrada');
      }
      
      const lead = await db.select()
        .from(leads)
        .where(eq(leads.id, sessao.leadId))
        .limit(1)
        .then(rows => rows[0]);
      
      const agora = new Date();
      const primeiraVez = !lead.formularioIniciado;
      
      const camposPreenchidos = sessao.camposPreenchidos || {};
      camposPreenchidos[campoInicial] = valor;
      
      await db.update(formularioSessoes)
        .set({
          camposPreenchidos: camposPreenchidos,
          ultimaAtividadeEm: agora,
          updatedAt: agora,
        })
        .where(eq(formularioSessoes.id, sessao.id));
      
      if (primeiraVez) {
        await db.update(leads)
          .set({
            formularioIniciado: true,
            formularioIniciadoEm: agora,
            updatedAt: agora,
          })
          .where(eq(leads.id, sessao.leadId));
        
        await db.insert(leadHistorico).values({
          leadId: sessao.leadId,
          tipoEvento: 'formulario_iniciado',
          descricao: 'Lead iniciou o preenchimento do formulário',
          dados: { campoInicial, valor },
        });
        
        console.log(`✏️ Lead iniciou preenchimento: ${sessao.sessaoId}`);
      }
      
      return { sucesso: true };
    } catch (error) {
      console.error('❌ Erro ao registrar início de preenchimento:', error);
      throw error;
    }
  }
  
  async atualizarProgresso(
    token: string, 
    camposPreenchidos: object, 
    totalCampos: number
  ) {
    try {
      const sessao = await db.select()
        .from(formularioSessoes)
        .where(eq(formularioSessoes.token, token))
        .limit(1)
        .then(rows => rows[0] || null);
      
      if (!sessao) {
        throw new Error('Sessão não encontrada');
      }
      
      const camposCount = Object.keys(camposPreenchidos).length;
      const progressoPercentual = Math.round((camposCount / totalCampos) * 100);
      
      await db.update(formularioSessoes)
        .set({
          camposPreenchidos: camposPreenchidos,
          progressoPercentual: progressoPercentual,
          ultimaAtividadeEm: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(formularioSessoes.id, sessao.id));
      
      console.log(`📊 Progresso atualizado: ${progressoPercentual}% (${camposCount}/${totalCampos})`);
      
      return {
        progresso: progressoPercentual,
        camposPreenchidos: camposCount,
        totalCampos,
      };
    } catch (error) {
      console.error('❌ Erro ao atualizar progresso:', error);
      throw error;
    }
  }
  
  async finalizarFormulario(
    token: string, 
    respostas: object, 
    metadados: { ip: string; userAgent: string; formularioId: string }
  ) {
    try {
      const sessao = await db.select()
        .from(formularioSessoes)
        .where(eq(formularioSessoes.token, token))
        .limit(1)
        .then(rows => rows[0] || null);
      
      if (!sessao) {
        throw new Error('Sessão não encontrada');
      }
      
      const lead = await db.select()
        .from(leads)
        .where(eq(leads.id, sessao.leadId))
        .limit(1)
        .then(rows => rows[0]);
      
      const formulario = await db.select()
        .from(forms)
        .where(eq(forms.id, metadados.formularioId))
        .limit(1)
        .then(rows => rows[0]);
      
      if (!formulario) {
        throw new Error('Formulário não encontrado');
      }
      
      let pontuacao = 0;
      const questions = Array.isArray(formulario.questions) ? formulario.questions : [];
      
      for (const question of questions) {
        const resposta = respostas[question.id];
        if (resposta && question.options) {
          const opcaoSelecionada = question.options.find((opt: any) => opt.text === resposta);
          if (opcaoSelecionada && opcaoSelecionada.score) {
            pontuacao += opcaoSelecionada.score;
          }
        }
      }
      
      const passou = pontuacao >= (formulario.passingScore || 0);
      const statusQualificacao = passou ? 'aprovado' : 'reprovado';
      
      let tempoPreenchimento = null;
      if (lead.formularioIniciadoEm) {
        const inicio = new Date(lead.formularioIniciadoEm);
        const fim = new Date();
        tempoPreenchimento = Math.round((fim.getTime() - inicio.getTime()) / 1000);
      }
      
      const [submission] = await db.insert(formSubmissions).values({
        formId: metadados.formularioId,
        answers: respostas,
        totalScore: pontuacao,
        passed: passou,
        contactPhone: lead.telefone,
        contactName: lead.nome,
        contactEmail: lead.email,
      }).returning();
      
      const agora = new Date();
      await db.update(leads)
        .set({
          formularioConcluido: true,
          formularioConcluidoEm: agora,
          pontuacao: pontuacao,
          statusQualificacao: statusQualificacao,
          submissionId: submission.id,
          updatedAt: agora,
        })
        .where(eq(leads.id, sessao.leadId));
      
      await db.update(formularioSessoes)
        .set({
          concluido: true,
          progressoPercentual: 100,
          ultimaAtividadeEm: agora,
          updatedAt: agora,
        })
        .where(eq(formularioSessoes.id, sessao.id));
      
      await db.insert(leadHistorico).values({
        leadId: sessao.leadId,
        tipoEvento: 'formulario_concluido',
        descricao: `Lead concluiu o formulário - ${statusQualificacao.toUpperCase()}`,
        dados: { 
          pontuacao, 
          passou, 
          submissionId: submission.id,
          tempoPreenchimento,
        },
        ipAddress: metadados.ip,
      });
      
      if (passou) {
        await db.insert(leadHistorico).values({
          leadId: sessao.leadId,
          tipoEvento: 'lead_aprovado',
          descricao: `Lead aprovado com ${pontuacao} pontos`,
          dados: { pontuacao },
        });
      } else {
        await db.insert(leadHistorico).values({
          leadId: sessao.leadId,
          tipoEvento: 'lead_reprovado',
          descricao: `Lead reprovado com ${pontuacao} pontos`,
          dados: { pontuacao },
        });
      }
      
      console.log(`🎯 Formulário finalizado: ${statusQualificacao.toUpperCase()} (${pontuacao} pts)`);
      
      const leadAtualizado = await db.select()
        .from(leads)
        .where(eq(leads.id, sessao.leadId))
        .limit(1)
        .then(rows => rows[0]);
      
      return {
        lead: leadAtualizado,
        qualificacao: statusQualificacao,
        tempoPreenchimento,
      };
    } catch (error) {
      console.error('❌ Erro ao finalizar formulário:', error);
      throw error;
    }
  }
  
  async buscarStatusReal(telefone: string) {
    try {
      const telefoneNormalizado = normalizePhone(telefone);
      
      const lead = await db.select()
        .from(leads)
        .where(eq(leads.telefoneNormalizado, telefoneNormalizado))
        .limit(1)
        .then(rows => rows[0] || null);
      
      if (!lead) {
        return {
          existe: false,
          telefoneNormalizado,
        };
      }
      
      const sessoes = await db.select()
        .from(formularioSessoes)
        .where(eq(formularioSessoes.leadId, lead.id))
        .orderBy(desc(formularioSessoes.createdAt));
      
      const sessaoAtiva = sessoes.find(s => !s.concluido) || null;
      
      const historico = await db.select()
        .from(leadHistorico)
        .where(eq(leadHistorico.leadId, lead.id))
        .orderBy(desc(leadHistorico.createdAt));
      
      return {
        existe: true,
        lead,
        sessaoAtiva,
        sessoes,
        historico,
        status: {
          formularioEnviado: lead.formularioEnviado,
          formularioAberto: lead.formularioAberto,
          formularioIniciado: lead.formularioIniciado,
          formularioConcluido: lead.formularioConcluido,
          visualizacoes: lead.formularioVisualizacoes || 0,
          progressoPercentual: sessaoAtiva?.progressoPercentual || 0,
          pontuacao: lead.pontuacao,
          statusQualificacao: lead.statusQualificacao,
        },
      };
    } catch (error) {
      console.error('❌ Erro ao buscar status real do lead:', error);
      throw error;
    }
  }
}

export const leadTrackingService = new LeadTrackingService();
