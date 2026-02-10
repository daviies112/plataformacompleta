/**
 * Email service using Resend
 * Handles transactional emails with template support
 */

import { Resend } from 'resend';
import { getResendCredentials } from './credentialsDb';
import { emailQueue } from './queue';

let resend: Resend | null = null;
let fromEmail: string = 'noreply@example.com';

/**
 * Initialize Resend client
 */
async function initializeResend(): Promise<boolean> {
  try {
    const credentials = await getResendCredentials();
    
    if (!credentials || !credentials.apiKey) {
      console.log('⚠️ Resend não configurado - Emails desativados');
      return false;
    }

    resend = new Resend(credentials.apiKey);
    fromEmail = credentials.fromEmail;
    
    console.log('✅ Resend inicializado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar Resend:', error);
    return false;
  }
}

/**
 * Send email directly (bypassing queue)
 */
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!resend) {
      const initialized = await initializeResend();
      if (!initialized) {
        return { 
          success: false, 
          error: 'Email service not configured' 
        };
      }
    }

    const response = await resend!.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
    });

    console.log(`✅ Email enviado com sucesso para ${options.to}`);
    
    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Queue email for background sending
 */
export async function queueEmail(options: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
}): Promise<string> {
  const jobId = await emailQueue.add('send_email', options, {
    maxAttempts: options.priority === 'high' ? 5 : 3,
  });
  
  console.log(`📧 Email enfileirado: ${options.subject} (Job: ${jobId})`);
  return jobId;
}

/**
 * Email templates
 */

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await queueEmail({
    to,
    subject: 'Bem-vindo ao ExecutiveAI Pro!',
    html: `
      <h1>Olá ${name}!</h1>
      <p>Bem-vindo ao ExecutiveAI Pro, sua plataforma completa de gestão empresarial.</p>
      <p>Estamos felizes em tê-lo conosco!</p>
      <p>
        <a href="${process.env.APP_URL || 'http://localhost:5000'}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Começar Agora
        </a>
      </p>
      <p>Atenciosamente,<br>Equipe ExecutiveAI Pro</p>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
  
  await queueEmail({
    to,
    subject: 'Redefinição de Senha - ExecutiveAI Pro',
    html: `
      <h1>Redefinição de Senha</h1>
      <p>Você solicitou a redefinição de senha da sua conta ExecutiveAI Pro.</p>
      <p>Clique no botão abaixo para redefinir sua senha:</p>
      <p>
        <a href="${resetUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Redefinir Senha
        </a>
      </p>
      <p>Este link expira em 1 hora.</p>
      <p>Se você não solicitou esta redefinição, ignore este email.</p>
      <p>Atenciosamente,<br>Equipe ExecutiveAI Pro</p>
    `,
    priority: 'high',
  });
}

export async function sendInviteEmail(to: string, inviterName: string, inviteLink: string): Promise<void> {
  await queueEmail({
    to,
    subject: `${inviterName} convidou você para o ExecutiveAI Pro`,
    html: `
      <h1>Você foi convidado!</h1>
      <p>${inviterName} convidou você para se juntar ao ExecutiveAI Pro.</p>
      <p>
        <a href="${inviteLink}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Aceitar Convite
        </a>
      </p>
      <p>Atenciosamente,<br>Equipe ExecutiveAI Pro</p>
    `,
  });
}

export async function sendNotificationEmail(
  to: string, 
  subject: string, 
  message: string,
  actionUrl?: string,
  actionText?: string
): Promise<void> {
  await queueEmail({
    to,
    subject,
    html: `
      <h1>${subject}</h1>
      <p>${message}</p>
      ${actionUrl && actionText ? `
        <p>
          <a href="${actionUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            ${actionText}
          </a>
        </p>
      ` : ''}
      <p>Atenciosamente,<br>Equipe ExecutiveAI Pro</p>
    `,
  });
}

export async function sendBillingEmail(
  to: string,
  type: 'invoice' | 'payment_success' | 'payment_failed' | 'subscription_ending',
  data: any
): Promise<void> {
  let subject = '';
  let html = '';

  switch (type) {
    case 'invoice':
      subject = `Nova fatura disponível - R$ ${data.amount}`;
      html = `
        <h1>Nova Fatura Disponível</h1>
        <p>Sua fatura de ${data.period} está disponível.</p>
        <p>Valor: R$ ${data.amount}</p>
        <p>Vencimento: ${data.dueDate}</p>
        <p>
          <a href="${data.invoiceUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Ver Fatura
          </a>
        </p>
      `;
      break;

    case 'payment_success':
      subject = 'Pagamento confirmado!';
      html = `
        <h1>Pagamento Confirmado</h1>
        <p>Recebemos seu pagamento de R$ ${data.amount}.</p>
        <p>Obrigado pela sua confiança!</p>
      `;
      break;

    case 'payment_failed':
      subject = 'Falha no pagamento';
      html = `
        <h1>Falha no Pagamento</h1>
        <p>Não conseguimos processar seu pagamento de R$ ${data.amount}.</p>
        <p>Por favor, verifique seus dados de pagamento.</p>
        <p>
          <a href="${data.updateUrl}" style="background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Atualizar Pagamento
          </a>
        </p>
      `;
      break;

    case 'subscription_ending':
      subject = 'Sua assinatura está terminando';
      html = `
        <h1>Assinatura Terminando</h1>
        <p>Sua assinatura termina em ${data.daysRemaining} dias.</p>
        <p>Renove agora para continuar usando todos os recursos.</p>
        <p>
          <a href="${data.renewUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Renovar Assinatura
          </a>
        </p>
      `;
      break;
  }

  await queueEmail({
    to,
    subject,
    html: html + '<p>Atenciosamente,<br>Equipe ExecutiveAI Pro</p>',
    priority: type === 'payment_failed' ? 'high' : 'normal',
  });
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(testEmail: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await sendEmail({
      to: testEmail,
      subject: 'Teste de Configuração - ExecutiveAI Pro',
      html: `
        <h1>Teste de Configuração</h1>
        <p>Este é um email de teste para verificar sua configuração do Resend.</p>
        <p>Se você recebeu este email, sua configuração está funcionando corretamente!</p>
        <p>Data do teste: ${new Date().toLocaleString('pt-BR')}</p>
      `,
    });

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Initialize Resend on module load
initializeResend().catch(console.error);

export { resend };
