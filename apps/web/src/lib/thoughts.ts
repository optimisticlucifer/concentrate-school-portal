// Curated, reflective (not motivational-poster). Rotates daily by day-of-year.
const STUDENT = [
  'Progress, not perfection. Small steps still move you forward.',
  'You do not have to be good at something to begin. Beginning is how you get good.',
  'Confusion is the feeling of learning something new.',
  'Rest is part of the work, not a break from it.',
  'The goal of practice is to make the hard parts feel ordinary.',
  'Curiosity outlasts pressure. Follow the question, not the grade.',
  'Mistakes are data. Read them, do not fear them.',
  'Understanding one idea deeply beats memorizing ten.',
  'Ask the question you think is too simple. It usually is not.',
  'Consistency is quieter than motivation, and it lasts longer.',
];

const TEACHER = [
  'A student who feels seen will risk being wrong.',
  'Feedback that names one specific thing lands harder than praise.',
  'The quiet student is often the one thinking hardest.',
  'You are not behind. You are teaching real people at a real pace.',
  'Clarity is a kindness. Say the important thing plainly.',
  'Small encouragements compound over a term.',
  'The lesson they remember is rarely the one you planned.',
  'Patience is a lesson too, and they are watching you model it.',
  'You do not need to reach everyone today. You need to reach someone.',
  'Curiosity is contagious. Bring your own.',
];

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86400000);
}

export function thoughtForToday(
  role: 'student' | 'teacher' | 'admin',
  date: Date = new Date()
): string {
  const pool = role === 'teacher' ? TEACHER : STUDENT;
  return pool[dayOfYear(date) % pool.length]!;
}
