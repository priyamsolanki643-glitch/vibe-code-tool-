import * as fs from 'fs';
import * as path from 'path';

// Paths to the brain files (relative to project root)
const BRAINS_DIR = path.resolve(process.cwd(), '..', 'brains');

function loadBrain(filename: string): string {
  try {
    const filePath = path.join(BRAINS_DIR, filename);
    return fs.readFileSync(filePath, 'utf-8').trim();
  } catch (e) {
    console.warn(`[ORACLE] Warning: Could not load brain file: ${filename}. Using fallback.`);
    return '';
  }
}

// Lazily loaded brain contexts — only read from disk once
let _elonBrain: string | null = null;
let _hesfyBrain: string | null = null;
let _topperBrain: string | null = null;
let _giglBrain: string | null = null;

export function getElonBrain(): string {
  if (!_elonBrain) _elonBrain = loadBrain('elon.txt');
  return _elonBrain;
}

export function getHesfyBrain(): string {
  if (!_hesfyBrain) _hesfyBrain = loadBrain('hesfy.txt');
  return _hesfyBrain;
}

export function getTopperBrain(): string {
  if (!_topperBrain) _topperBrain = loadBrain('topper.txt');
  return _topperBrain;
}

export function getGiglBrain(): string {
  if (!_giglBrain) _giglBrain = loadBrain('gigl.txt');
  return _giglBrain;
}

export type SoulId = 'VISIONARY' | 'SCHOLAR' | 'HACKER' | 'DRILL_SERGEANT';

export const SOUL_METADATA: Record<SoulId, { name: string; emoji: string; color: string }> = {
  VISIONARY:       { name: 'The Visionary',       emoji: '🚀', color: '#3B82F6' },
  SCHOLAR:         { name: 'The Scholar',          emoji: '📚', color: '#22C55E' },
  HACKER:          { name: 'The Hacker',           emoji: '⚡', color: '#EAB308' },
  DRILL_SERGEANT:  { name: 'Hesfy',                emoji: '🐺', color: '#EF4444' },
};

export function getBrainForSoul(soul: SoulId): string {
  switch (soul) {
    case 'VISIONARY':       return getElonBrain();
    case 'SCHOLAR':         return getTopperBrain();
    case 'HACKER':          return getGiglBrain();
    case 'DRILL_SERGEANT':  return getHesfyBrain();
    default:                return getElonBrain();
  }
}
