import { EventEmitter } from 'events';
import { DbService } from '../services/db.service';

/**
 * Enterprise Event-Driven Worker Queue
 * Decouples heavy linguistic and predictive extraction from the main API thread.
 */
class AnalyticsQueue extends EventEmitter {
  constructor() {
    super();
    // Simulate a background worker pulling from a message broker (e.g. RabbitMQ/Kafka)
    this.on('processLinguisticSignal', async (payload: { userId: string, message: string }) => {
      try {
        await this.processSignal(payload.userId, payload.message);
      } catch (e) {
        console.error('[ANALYTICS_WORKER] Failed to process signal:', e);
      }
    });
  }

  private async processSignal(userId: string, message: string) {
    const lastSignal = await DbService.getLastLinguisticSignal(userId);
    const messageLength = message.length;
    
    let responseDelayMinutes = 0;
    if (lastSignal) {
      const lastTime = new Date(lastSignal.timestamp).getTime();
      const nowTime = new Date().getTime();
      responseDelayMinutes = Math.floor((nowTime - lastTime) / 60000);
    }

    const lowerMsg = message.toLowerCase();
    const hesitationWords = ['maybe', 'try', 'but', 'perhaps', 'trying', 'kal se', 'sochunga', 'not sure'];
    const hesitationCount = hesitationWords.reduce((count, word) => count + (lowerMsg.split(word).length - 1), 0);
    
    const stressDetected = hesitationCount > 1 || messageLength < 15;
    let energyLevel = 'medium';
    if (messageLength > 100 && !stressDetected) energyLevel = 'high';
    else if (stressDetected) energyLevel = 'low';

    let subject = 'none';
    if (lowerMsg.match(/(physics|maths|chemistry|bio|rotational|kinematics|organic)/)) {
      subject = lowerMsg.match(/(physics|maths|chemistry|bio|rotational|kinematics|organic)/)![0];
    }

    await DbService.saveLinguisticSignal({
      user_id: userId,
      message_length: messageLength,
      response_delay_minutes: responseDelayMinutes,
      hesitation_count: hesitationCount,
      stress_detected: stressDetected,
      subject,
      energy_level: energyLevel
    });

    const last7Days = await DbService.getLinguisticSignalsLast7Days(userId);
    if (last7Days.length >= 7 && last7Days.length % 7 === 0) { 
      const avgHesitation = last7Days.reduce((sum, log) => sum + log.hesitation_count, 0) / 7;
      const stressRatio = last7Days.filter(l => l.stress_detected).length / 7;
      
      const dropoutRiskScore = Math.min(100, Math.floor((avgHesitation * 15) + (stressRatio * 50) + 10));
      
      await DbService.saveWeeklyRiskReport({
        user_id: userId,
        dropout_risk_score: dropoutRiskScore,
        dominant_avoidance_subject: subject,
        consistency_fingerprint_trend: stressRatio > 0.5 ? 'declining' : 'improving'
      });
      console.log(`[ANALYTICS_WORKER] Generated Weekly Risk Report for ${userId}. Risk Score: ${dropoutRiskScore}`);
    }
  }

  public enqueueMessageAnalysis(userId: string, message: string) {
    this.emit('processLinguisticSignal', { userId, message });
  }
}

export const analyticsWorker = new AnalyticsQueue();
