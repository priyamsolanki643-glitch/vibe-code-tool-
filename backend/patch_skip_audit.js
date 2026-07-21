const fs = require('fs');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Find the start of the block
  const completeStart = content.indexOf('if (extraction.isComplete) {');
  if (completeStart === -1) {
    console.error('Could not find if (extraction.isComplete) in ' + filePath);
    return;
  }

  // We need to replace everything from "const msgClean = message.toLowerCase().trim();"
  // down to the start of the geoLower block, replacing it with just "const chosenPath = 'alpha';"
  
  const geoLowerIndex = content.indexOf("const geoLower = (extraction.region || '').toLowerCase();", completeStart);
  if (geoLowerIndex === -1) {
    console.error('Could not find geoLower block in ' + filePath);
    return;
  }

  const msgCleanStart = content.indexOf('const msgClean = message.toLowerCase().trim();', completeStart);
  
  if (msgCleanStart === -1 || msgCleanStart > geoLowerIndex) {
    console.error('Could not find msgClean inside block in ' + filePath);
    return;
  }

  // Replace the chunk
  const part1 = content.substring(0, msgCleanStart);
  const part2 = "const chosenPath = 'alpha';\n          console.log(`MESSAGE: Auto-locking trajectory in chat.`);\n          \n          ";
  const part3 = content.substring(geoLowerIndex);
  content = part1 + part2 + part3;

  // Now, inside the modified block, we have the geo logic, then simulationData generation, then saving the mission.
  // After saving the mission, we have:
  // result = { type: 'trajectory_locked', data: executionResult };
  // We need to change this to return onboarding_complete so the UI shows the Vault button.
  // BUT we also need to DELETE the `} else {` block that follows the `trajectory_locked` line!

  // Let's find the trajectory_locked line.
  const trajLockedIdx = content.indexOf("result = { type: 'trajectory_locked', data: executionResult };", completeStart);
  if (trajLockedIdx === -1) {
    console.error('Could not find trajectory_locked in ' + filePath);
    return;
  }

  // We change it to onboarding_complete.
  const newTrajLocked = "result = { type: 'onboarding_complete', data: simulationData };";
  content = content.substring(0, trajLockedIdx) + newTrajLocked + content.substring(trajLockedIdx + "result = { type: 'trajectory_locked', data: executionResult };".length);

  // Now find the `} else {` block and delete it.
  // The block starts right after the newTrajLocked line.
  // It looks like:
  //         } else {
  //           // Onboarding complete, but user hasn't made a choice yet. Present simulated paths.
  //           const geoLower = (extraction.region || '').toLowerCase();
  
  // To safely delete it, we find `} else {` after trajLockedIdx
  const elseIdx = content.indexOf("} else {", trajLockedIdx);
  if (elseIdx === -1) {
    console.error('Could not find else block in ' + filePath);
    return;
  }
  
  // Find the end of this else block by finding the NEXT `} else {` which is for "Onboarding is incomplete."
  const nextElseIdx = content.indexOf("} else {", elseIdx + 1);
  if (nextElseIdx === -1) {
    console.error('Could not find next else block in ' + filePath);
    return;
  }
  
  // The end of our target else block is the `}` just before `nextElseIdx`.
  const endOfElseIdx = content.lastIndexOf("}", nextElseIdx - 1);
  
  content = content.substring(0, elseIdx) + content.substring(endOfElseIdx + 1);

  fs.writeFileSync(filePath, content);
  console.log('Successfully patched ' + filePath);
}

patchFile('src/routes/stream.routes.ts');
patchFile('src/routes/interaction.routes.ts');
