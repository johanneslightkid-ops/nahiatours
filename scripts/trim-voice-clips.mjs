/**
 * Trim the silence a speech synthesiser leaves around each planner clip.
 *
 * The voice guide reads a question as one clip per option, back to back.
 * Rendered clips come with about 0.3 s of silence in front and half a second
 * behind, which between options adds up to a second of dead air before the
 * next answer is heard. This keeps 30 ms at the start and 80 ms at the end
 * (enough not to clip a soft consonant), re-encoding with the same settings.
 *
 *   node scripts/trim-voice-clips.mjs [public/audio/planner]
 *
 * Needs ffmpeg on the PATH. Safe to run again: a trimmed clip stays as it is.
 * Run it after recording new clips; the manifest needs no change (it
 * fingerprints the words, not the audio).
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? 'public/audio/planner';
const filter = [
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03',
  'areverse',
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08',
  'areverse',
].join(',');

let count = 0;
let saved = 0;
const duration = (file) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());

for (const lang of readdirSync(root)) {
  const dir = join(root, lang);
  if (!statSync(dir).isDirectory()) continue;
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.mp3'))) {
    const file = join(dir, name);
    const temp = `${file}.tmp.mp3`;
    const before = duration(file);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-af', filter, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '48k', temp]);
    const after = duration(temp);
    // Never keep a result that lost speech: only silence may go.
    if (after > 0.2 && after <= before) {
      renameSync(temp, file);
      saved += before - after;
      count += 1;
    } else {
      execFileSync('rm', ['-f', temp]);
    }
  }
}
console.log(`Trimmed ${count} clips, ${saved.toFixed(1)} s of silence removed.`);
