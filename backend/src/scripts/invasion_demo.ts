import { DbService } from '../services/db.service';
import { v4 as uuidv4 } from 'uuid';

// Invasion Mode: Generates 5,000 highly realistic student profiles for the PW B2B Pitch

export async function runInvasionDemo() {
  console.log("🚀 INVASION MODE INITIALIZED");
  console.log("Generating 5,000 realistic student profiles for PW CMO Pitch...");

  const subjects = ['Physics', 'Organic Chemistry', 'Rotational Mechanics', 'Biology', 'Maths'];
  const exams = ['JEE', 'NEET', 'UPSC'];
  
  let redBandCount = 0;
  const TOTAL_STUDENTS = 5000;

  for (let i = 0; i < TOTAL_STUDENTS; i++) {
    const userId = `student_demo_${uuidv4().substring(0, 8)}`;
    const isRedBand = Math.random() > 0.85; // ~15% red band rate
    if (isRedBand) redBandCount++;

    const consistencyScore = isRedBand ? Math.floor(Math.random() * 30) : Math.floor(Math.random() * 40) + 60;
    const targetExam = exams[Math.floor(Math.random() * exams.length)];
    const failingSubject = subjects[Math.floor(Math.random() * subjects.length)];

    // 1. Generate Fake Mission
    await DbService.saveMission({
      id: uuidv4(),
      user_id: userId,
      missionName: `${targetExam} Selection Sprint`,
      lockedPath: 'alpha',
      probabilityLow: isRedBand ? 12 : 65,
      probabilityHigh: isRedBand ? 18 : 85,
      dayNumber: Math.floor(Math.random() * 60) + 1,
      totalDays: 90,
      consistencyScore,
      streakDays: isRedBand ? 0 : Math.floor(Math.random() * 15) + 2,
      mindsetBrief: 'Execute or fail.',
      strategyContent: `Master ${failingSubject}`,
      chatThreadId: `thread_${userId}`
    });

    // 2. Generate Weekly Risk Report
    await DbService.saveWeeklyRiskReport({
      id: uuidv4(),
      user_id: userId,
      dropout_risk_score: isRedBand ? Math.floor(Math.random() * 20) + 80 : Math.floor(Math.random() * 30),
      dominant_avoidance_subject: failingSubject,
      consistency_fingerprint_trend: isRedBand ? 'declining' : 'improving'
    });

    if (i % 500 === 0 && i > 0) {
      console.log(`... Generated ${i} student profiles ...`);
    }
  }

  console.log("✅ INVASION COMPLETE.");
  console.log(`Total Active Students: ${TOTAL_STUDENTS}`);
  console.log(`Red Band Alerts Generated: ${redBandCount}`);
  console.log("B2B Dashboard is now primed for the 20-Crore Pitch.");
}

// Execute directly
runInvasionDemo().then(() => {
  console.log("Done");
}).catch(console.error);
