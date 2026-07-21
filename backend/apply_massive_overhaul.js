const fs = require('fs');

function overhaulStreamRoute(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Change the activeMission check
  content = content.replace(
    /if \(activeMission\) \{/g,
    "if (activeMission && activeMission.lockedPath !== 'draft') {"
  );

  // 2. Introduce proactive AI check-ins
  // We want the AI to ask "how did execution go today?" if it's a new day.
  // Wait, the user wants the AI to proactively ask.
  // Let's modify the critique mode `buildFullSystemPrompt` part.
  const critiquePromptLogic = `
      // Proactive Daily Check-in Logic
      const todayDate = new Date().toISOString().split('T')[0];
      const lastLogDate = activeMission.lastDailyLogDate || '';
      let proactiveNudge = '';
      if (todayDate !== lastLogDate) {
        proactiveNudge = 'PROACTIVE_ACCOUNTABILITY_CHECK: The user has NOT logged their execution for today. Start your response by directly asking them what they executed today and holding them accountable. Be strict but brotherly.';
      }

      const critiqueResult = await processCritiqueMessage(message, {
        userId: actualUserId,
        userRuntime: activeMission.userRuntime,
        userMessage: proactiveNudge + ' ' + message,
        tasksCompletedToDate: Math.floor(activeMission.consistencyScore / 10),
        tasksAttemptedToDate: Math.floor(activeMission.consistencyScore / 10) + activeMission.consecutiveFailureCount,
        consecutiveFailureCount: activeMission.consecutiveFailureCount,
      }, userLanguage);
  `;
  
  // Actually, replacing exactly is tricky, let's just do a specific string replace:
  content = content.replace(
    /const critiqueResult = await processCritiqueMessage\(message, \{/g,
    `const todayDate = new Date().toISOString().split('T')[0];
      const lastLogDate = activeMission.lastDailyLogDate || '';
      let proactiveNudge = '';
      if (todayDate !== lastLogDate && activeMission.dayNumber > 1) {
        proactiveNudge = '\\n\\n[SYSTEM DIRECTIVE: The user has NOT logged execution for today. Before responding to their message, strictly ask them how their execution went today. Hold them accountable.]\\n';
      }

      const critiqueResult = await processCritiqueMessage(message + proactiveNudge, {`
  );

  // 3. Early vault creation
  // Find where extraction happens.
  const extractionLogic = `
      if (extraction.declaredGoal && !activeMission) {
        console.log('MESSAGE: Goal declared. Initializing draft vault.');
        const draftPayload = {
          user_id: actualUserId,
          missionName: extraction.declaredGoal,
          lockedPath: 'draft',
          probabilityLow: 0,
          probabilityHigh: 0,
          dayNumber: 0,
          totalDays: 90,
          consistencyScore: 0,
          streakDays: 0,
          mindsetBrief: "Onboarding in progress. Strategy compiling...",
          strategyContent: "Awaiting locked trajectory.",
          chatThreadId: currentThreadId
        };
        await DbService.saveMission(draftPayload);
        // We will push an SSE event vault_initialized
      }
      
      if (extraction.isComplete) {`;

  content = content.replace(
    /if \(extraction\.isComplete\) \{/g,
    extractionLogic
  );

  // 4. Update the SSE to push vault_initialized
  // In `stream.routes.ts`, after `try { const streamRes = await ...`
  // Actually, we can push metadata.
  const streamResLogic = `
        if (extraction && extraction.declaredGoal && !activeMission) {
          await streamWriter.writeSSE({ data: JSON.stringify({ type: 'metadata', data: { thread_id: currentThreadId, vault_initialized: true } }) });
        }
  `;
  // We can inject this right after the stream buffer logic, but it's easier to just rely on the frontend polling or Supabase realtime!

  fs.writeFileSync(filePath, content);
  console.log('Overhauled ' + filePath);
}

overhaulStreamRoute('src/routes/stream.routes.ts');
// Doing the same for interaction.routes.ts
overhaulStreamRoute('src/routes/interaction.routes.ts');
