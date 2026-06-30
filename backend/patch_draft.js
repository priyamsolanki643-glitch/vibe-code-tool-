const fs = require('fs');

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Find where `if (extraction.isComplete)` starts
  const completeStart = content.indexOf('if (extraction.isComplete) {');
  if (completeStart === -1) return false;

  // We need to remove the isAlpha/isBeta check.
  const regex = /const msgClean = message\.toLowerCase\(\)\.trim\(\);[\s\S]*?if \(isAlphaChoice \|\| isBetaChoice\) \{[\s\S]*?const chosenPath = isAlphaChoice \? 'alpha' : 'beta';/m;
  
  content = content.replace(regex, `const chosenPath = 'alpha';`);

  // Now we need to remove the else block that happens when they haven't chosen.
  // The else block looks like:
  // } else {
  //   const geoLower = (extraction.region || '').toLowerCase();
  //   ...
  //   result = { type: 'onboarding_complete', data: simulationData };
  // }
  
  // Actually, wait. The geoLower logic is DUPLICATED in both if and else blocks!
  // Let's just manually string replace the block!
  
  return content;
}
