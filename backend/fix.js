const fs = require('fs');

let streamContent = fs.readFileSync('src/routes/stream.routes.ts', 'utf-8');

streamContent = streamContent.replace(
  /import \{ processCritiqueMessage, buildFullSystemPrompt \} from '\.\.\/engine\/index';/,
  `import { processCritiqueMessage, buildFullSystemPrompt, processOnboarding, transitionToExecution } from '../engine/index';`
);

let interactionContent = fs.readFileSync('src/routes/interaction.routes.ts', 'utf-8');

// Find the interaction else block
const interactElseStart = interactionContent.indexOf('    } else {\r\n      // User has no active mission.') !== -1 
    ? interactionContent.indexOf('    } else {\r\n      // User has no active mission.') 
    : interactionContent.indexOf('    } else {\n      // User has no active mission.');

const interactElseEnd = interactionContent.indexOf('    // ── Intercept for Consistency Onboarding');

if (interactElseStart === -1 || interactElseEnd === -1) {
  console.error('Could not find interaction block');
  process.exit(1);
}

let newElseBlock = interactionContent.substring(interactElseStart, interactElseEnd);

// Modify the catch block inside the new else block
newElseBlock = newElseBlock.replace(
  /\} catch \(err: any\) \{[\s\S]*?return c\.json\([\s\S]*?200(\r)?\n        \);(\r)?\n      \}/,
  `} catch (err: any) {
        console.error('ONBOARDING_EXTRACTION_ERROR:', getAIErrorMessage(err));
        const safeText = toUserSafeAIText(err);
        return streamSSE(c, async (streamWriter) => {
          await streamWriter.writeSSE({ data: JSON.stringify({ type: 'metadata', data: { thread_id: currentThreadId } }) });
          await streamWriter.writeSSE({ data: JSON.stringify({ type: 'text', text: safeText }) });
        });
      }`
);

newElseBlock = newElseBlock.replace(/systemPrompt = /g, 'finalSystemPrompt = ');

// Find the stream else block
const streamElseStartRegex = /    \} else \{\r?\n      finalSystemPrompt = `You are Lumensky/;
const matchStart = streamElseStartRegex.exec(streamContent);
if (!matchStart) {
  console.error('Could not find stream else start');
  process.exit(1);
}

const streamElseEndRegex = /    let streamData: any;/;
const matchEnd = streamElseEndRegex.exec(streamContent);
if (!matchEnd) {
  console.error('Could not find stream else end');
  process.exit(1);
}

const finalContent = streamContent.substring(0, matchStart.index) + newElseBlock + streamContent.substring(matchEnd.index);

fs.writeFileSync('src/routes/stream.routes.ts', finalContent);
console.log('Successfully updated stream.routes.ts');
