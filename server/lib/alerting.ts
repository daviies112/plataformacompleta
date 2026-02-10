/**
 * Automated Alerting System
 * Sends alerts when quotas reach warning/critical thresholds
 * Integrates with: n8n webhooks, console logs, email (if configured)
 */

import { getUsageStats } from './limitMonitor';

/**
 * Alert thresholds
 */
export const ALERT_THRESHOLDS = {
  warning: 80,  // 80%
  critical: 95, // 95%
};

/**
 * Alert channels
 */
export interface AlertChannel {
  name: string;
  enabled: boolean;
  send: (alert: Alert) => Promise<void>;
}

/**
 * Alert interface
 */
export interface Alert {
  level: 'info' | 'warning' | 'critical';
  service: string;
  metric: string;
  current: number;
  limit: number;
  percentage: number;
  message: string;
  timestamp: Date;
  recommendations: string[];
}

/**
 * Last alert tracking to avoid spam
 */
const lastAlerts = new Map<string, Date>();
const ALERT_COOLDOWN = 3600000; // 1 hour

/**
 * Check if alert should be sent (cooldown check)
 */
function shouldSendAlert(alertKey: string): boolean {
  const last = lastAlerts.get(alertKey);
  if (!last) return true;
  
  const elapsed = Date.now() - last.getTime();
  return elapsed > ALERT_COOLDOWN;
}

/**
 * Mark alert as sent
 */
function markAlertSent(alertKey: string): void {
  lastAlerts.set(alertKey, new Date());
}

/**
 * Console logger channel
 */
const consoleChannel: AlertChannel = {
  name: 'console',
  enabled: true,
  async send(alert: Alert): Promise<void> {
    const emoji = alert.level === 'critical' ? '🔴' : alert.level === 'warning' ? '🟡' : 'ℹ️';
    console.log(`\n${emoji} ALERT [${alert.level.toUpperCase()}] - ${alert.service}`);
    console.log(`   ${alert.message}`);
    console.log(`   Current: ${alert.current} / ${alert.limit} (${alert.percentage.toFixed(1)}%)`);
    
    if (alert.recommendations.length > 0) {
      console.log('   Recommendations:');
      alert.recommendations.forEach(rec => console.log(`     - ${rec}`));
    }
    console.log('');
  },
};

/**
 * n8n webhook channel
 */
const n8nChannel: AlertChannel = {
  name: 'n8n',
  enabled: !!process.env.N8N_ALERT_WEBHOOK_URL,
  async send(alert: Alert): Promise<void> {
    const webhookUrl = process.env.N8N_ALERT_WEBHOOK_URL;
    if (!webhookUrl) return;
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_level: alert.level,
          service: alert.service,
          metric: alert.metric,
          percentage: alert.percentage,
          message: alert.message,
          recommendations: alert.recommendations,
          timestamp: alert.timestamp.toISOString(),
        }),
      });
      
      if (!response.ok) {
        console.error(`Failed to send n8n alert: ${response.statusText}`);
      } else {
        console.log(`✅ Alert sent to n8n: ${alert.service}`);
      }
    } catch (error) {
      console.error('Error sending n8n alert:', error);
    }
  },
};

/**
 * Email channel (via Resend)
 */
const emailChannel: AlertChannel = {
  name: 'email',
  enabled: !!process.env.RESEND_API_KEY && !!process.env.ALERT_EMAIL,
  async send(alert: Alert): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.ALERT_EMAIL;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'alerts@executiveai.pro';
    
    if (!apiKey || !toEmail) return;
    
    try {
      const subject = `[${alert.level.toUpperCase()}] ${alert.service} - ${alert.percentage.toFixed(0)}% Usage`;
      const body = `
        <h2>⚠️ Quota Alert: ${alert.service}</h2>
        <p><strong>Level:</strong> ${alert.level.toUpperCase()}</p>
        <p><strong>Message:</strong> ${alert.message}</p>
        <p><strong>Usage:</strong> ${alert.current} / ${alert.limit} (${alert.percentage.toFixed(1)}%)</p>
        <p><strong>Timestamp:</strong> ${alert.timestamp.toISOString()}</p>
        
        <h3>Recommendations:</h3>
        <ul>
          ${alert.recommendations.map(rec => `<li>${rec}</li>`).join('\n')}
        </ul>
      `;
      
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: toEmail,
          subject,
          html: body,
        }),
      });
      
      if (!response.ok) {
        console.error(`Failed to send email alert: ${response.statusText}`);
      } else {
        console.log(`✅ Alert sent via email: ${alert.service}`);
      }
    } catch (error) {
      console.error('Error sending email alert:', error);
    }
  },
};

/**
 * All alert channels
 */
const channels: AlertChannel[] = [
  consoleChannel,
  n8nChannel,
  emailChannel,
];

/**
 * Send alert to all enabled channels
 */
async function sendAlert(alert: Alert): Promise<void> {
  const alertKey = `${alert.service}:${alert.level}`;
  
  // Check cooldown
  if (!shouldSendAlert(alertKey)) {
    console.log(`⏸️ Alert cooldown active for ${alertKey}`);
    return;
  }
  
  // Send to all enabled channels
  const promises = channels
    .filter(channel => channel.enabled)
    .map(channel => channel.send(alert));
  
  await Promise.all(promises);
  
  // Mark as sent
  markAlertSent(alertKey);
}

/**
 * Check quotas and send alerts if needed
 */
export async function checkAndAlert(): Promise<void> {
  const usage = await getUsageStats();
  
  // Check Redis
  if (usage.redis.percentage >= ALERT_THRESHOLDS.critical) {
    await sendAlert({
      level: 'critical',
      service: 'Redis (Upstash)',
      metric: 'commands',
      current: usage.redis.commandsToday,
      limit: usage.redis.limit,
      percentage: usage.redis.percentage,
      message: `Redis commands at ${usage.redis.percentage.toFixed(1)}% of daily limit`,
      timestamp: new Date(),
      recommendations: [
        'Increase cache TTL to reduce command frequency',
        'Switch to memory cache for less critical data',
        'Consider upgrading to Upstash Pro ($10/month)',
      ],
    });
  } else if (usage.redis.percentage >= ALERT_THRESHOLDS.warning) {
    await sendAlert({
      level: 'warning',
      service: 'Redis (Upstash)',
      metric: 'commands',
      current: usage.redis.commandsToday,
      limit: usage.redis.limit,
      percentage: usage.redis.percentage,
      message: `Redis commands at ${usage.redis.percentage.toFixed(1)}% of daily limit`,
      timestamp: new Date(),
      recommendations: [
        'Monitor cache usage closely',
        'Review cache TTL settings',
        'Check for cache stampedes',
      ],
    });
  }
  
  // Check Supabase
  if (usage.supabase.percentage >= ALERT_THRESHOLDS.critical) {
    await sendAlert({
      level: 'critical',
      service: 'Supabase',
      metric: 'bandwidth',
      current: usage.supabase.bandwidthUsed,
      limit: usage.supabase.limit,
      percentage: usage.supabase.percentage,
      message: `Supabase bandwidth at ${usage.supabase.percentage.toFixed(1)}% of monthly limit`,
      timestamp: new Date(),
      recommendations: [
        'Enable Cloudflare caching immediately',
        'Reduce API call frequency',
        'Implement request batching',
        'Consider upgrading to Supabase Pro ($25/month)',
      ],
    });
  } else if (usage.supabase.percentage >= ALERT_THRESHOLDS.warning) {
    await sendAlert({
      level: 'warning',
      service: 'Supabase',
      metric: 'bandwidth',
      current: usage.supabase.bandwidthUsed,
      limit: usage.supabase.limit,
      percentage: usage.supabase.percentage,
      message: `Supabase bandwidth at ${usage.supabase.percentage.toFixed(1)}% of monthly limit`,
      timestamp: new Date(),
      recommendations: [
        'Review Cloudflare cache hit rate',
        'Optimize API queries (select specific fields)',
        'Increase cache TTL for stable data',
      ],
    });
  }
}

/**
 * Start automatic alerting (run every 5 minutes)
 */
let alertInterval: NodeJS.Timeout | null = null;

export function startAutomaticAlerting(intervalMs: number = 300000): void {
  if (alertInterval) {
    console.log('⚠️ Automatic alerting already running');
    return;
  }
  
  console.log('🚀 Starting automatic alerting (interval: 5min)');
  
  // Run immediately
  checkAndAlert().catch(console.error);
  
  // Then run every intervalMs
  alertInterval = setInterval(() => {
    checkAndAlert().catch(console.error);
  }, intervalMs);
}

/**
 * Stop automatic alerting
 */
export function stopAutomaticAlerting(): void {
  if (alertInterval) {
    clearInterval(alertInterval);
    alertInterval = null;
    console.log('🛑 Automatic alerting stopped');
  }
}

/**
 * Manual alert test
 */
export async function testAlert(level: 'info' | 'warning' | 'critical' = 'info'): Promise<void> {
  await sendAlert({
    level,
    service: 'Test Service',
    metric: 'test_metric',
    current: 85,
    limit: 100,
    percentage: 85,
    message: `Test alert - level: ${level}`,
    timestamp: new Date(),
    recommendations: ['This is a test alert', 'No action needed'],
  });
}
