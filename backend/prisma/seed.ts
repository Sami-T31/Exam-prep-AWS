import { PrismaClient, StreamSlug, Difficulty, QuestionStatus, LeaderboardPeriod } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD,
});

// ---------------------------------------------------------------------------
// Reference data — streams
// ---------------------------------------------------------------------------
const STREAMS = [
  { name: 'Natural Science', slug: StreamSlug.NATURAL_SCIENCE },
  { name: 'Social Science', slug: StreamSlug.SOCIAL_SCIENCE },
] as const;

// ---------------------------------------------------------------------------
// Reference data — subjects with their stream memberships
// Mirrors packages/shared/src/constants/subjects.ts
// ---------------------------------------------------------------------------
const SUBJECTS: { name: string; streams: StreamSlug[] }[] = [
  { name: 'Mathematics', streams: [StreamSlug.NATURAL_SCIENCE, StreamSlug.SOCIAL_SCIENCE] },
  { name: 'English', streams: [StreamSlug.NATURAL_SCIENCE, StreamSlug.SOCIAL_SCIENCE] },
  { name: 'Amharic', streams: [StreamSlug.NATURAL_SCIENCE, StreamSlug.SOCIAL_SCIENCE] },
  { name: 'Civics', streams: [StreamSlug.NATURAL_SCIENCE, StreamSlug.SOCIAL_SCIENCE] },
  { name: 'Physics', streams: [StreamSlug.NATURAL_SCIENCE] },
  { name: 'Chemistry', streams: [StreamSlug.NATURAL_SCIENCE] },
  { name: 'Biology', streams: [StreamSlug.NATURAL_SCIENCE] },
  { name: 'Economics', streams: [StreamSlug.SOCIAL_SCIENCE] },
  { name: 'Geography', streams: [StreamSlug.SOCIAL_SCIENCE] },
  { name: 'History', streams: [StreamSlug.SOCIAL_SCIENCE] },
  { name: 'Aptitude', streams: [StreamSlug.NATURAL_SCIENCE, StreamSlug.SOCIAL_SCIENCE] },
];

// ---------------------------------------------------------------------------
// Reference data — grade levels
// ---------------------------------------------------------------------------
const GRADE_NUMBERS = [9, 10, 11, 12] as const;

// ---------------------------------------------------------------------------
// Sample topics per subject (grade 12 only, for demonstration)
// Real content will be added via the admin dashboard.
// ---------------------------------------------------------------------------
const SAMPLE_TOPICS: { subjectName: string; topics: string[] }[] = [
  {
    subjectName: 'Mathematics',
    topics: [
      'Sequences and Series',
      'Limits and Continuity',
      'Differential Calculus',
      'Integral Calculus',
      'Vectors in Space',
    ],
  },
  {
    subjectName: 'Physics',
    topics: [
      'Electromagnetic Induction',
      'Alternating Current',
      'Atomic Physics',
      'Nuclear Physics',
      'Electronics',
    ],
  },
  {
    subjectName: 'Chemistry',
    topics: [
      'Organic Chemistry',
      'Polymers',
      'Electrochemistry',
      'Chemical Kinetics',
      'Chemical Equilibrium',
    ],
  },
  {
    subjectName: 'Biology',
    topics: [
      'Genetics and Heredity',
      'Evolution',
      'Human Physiology',
      'Ecology and Environment',
      'Biotechnology',
    ],
  },
  {
    subjectName: 'English',
    topics: [
      'Reading Comprehension',
      'Grammar and Sentence Structure',
      'Vocabulary in Context',
      'Writing Skills',
      'Literature Analysis',
    ],
  },
];

// ---------------------------------------------------------------------------
// Sample questions per topic (grade 12)
// ---------------------------------------------------------------------------
interface SeedQuestion {
  questionText: string;
  explanation: string;
  difficulty: Difficulty;
  options: { label: string; text: string; isCorrect: boolean }[];
}

const QUESTIONS_BY_TOPIC: Record<string, SeedQuestion[]> = {
  'Sequences and Series': [
    {
      questionText: 'What is the sum of the first 20 terms of the arithmetic series 3 + 7 + 11 + 15 + ...?',
      explanation: 'Arithmetic series with a₁ = 3, d = 4. S₂₀ = 20/2 × (2×3 + 19×4) = 10 × 82 = 820.',
      difficulty: Difficulty.MEDIUM,
      options: [
        { label: 'A', text: '780', isCorrect: false },
        { label: 'B', text: '820', isCorrect: true },
        { label: 'C', text: '860', isCorrect: false },
        { label: 'D', text: '900', isCorrect: false },
      ],
    },
    {
      questionText: 'Which of the following is a geometric sequence?',
      explanation: 'For 2, 6, 18, 54: common ratio r = 3.',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: '2, 4, 6, 8', isCorrect: false },
        { label: 'B', text: '1, 3, 6, 10', isCorrect: false },
        { label: 'C', text: '2, 6, 18, 54', isCorrect: true },
        { label: 'D', text: '5, 10, 14, 17', isCorrect: false },
      ],
    },
    {
      questionText: 'The sum to infinity of the geometric series 1 + 1/2 + 1/4 + 1/8 + ... is:',
      explanation: 'S∞ = a₁/(1 - r) = 1/(1 - 1/2) = 2.',
      difficulty: Difficulty.MEDIUM,
      options: [
        { label: 'A', text: '1', isCorrect: false },
        { label: 'B', text: '3/2', isCorrect: false },
        { label: 'C', text: '2', isCorrect: true },
        { label: 'D', text: '∞', isCorrect: false },
      ],
    },
    {
      questionText: 'If the 5th term of an arithmetic sequence is 21 and the 10th term is 41, what is the first term?',
      explanation: 'a₅ = a₁ + 4d = 21, a₁₀ = a₁ + 9d = 41. Subtracting: 5d = 20, d = 4. a₁ = 5.',
      difficulty: Difficulty.MEDIUM,
      options: [
        { label: 'A', text: '1', isCorrect: false },
        { label: 'B', text: '3', isCorrect: false },
        { label: 'C', text: '5', isCorrect: true },
        { label: 'D', text: '7', isCorrect: false },
      ],
    },
    {
      questionText: 'The nth term of the sequence 2, 5, 10, 17, 26, ... is given by:',
      explanation: 'Pattern: 1²+1, 2²+1, 3²+1, ... → n² + 1.',
      difficulty: Difficulty.HARD,
      options: [
        { label: 'A', text: 'n² + 1', isCorrect: true },
        { label: 'B', text: '2n + 1', isCorrect: false },
        { label: 'C', text: 'n² - 1', isCorrect: false },
        { label: 'D', text: 'n(n + 1)/2', isCorrect: false },
      ],
    },
  ],

  'Limits and Continuity': [
    {
      questionText: 'What is lim(x→2) (x² - 4)/(x - 2)?',
      explanation: 'Factor: (x²-4)/(x-2) = (x+2)(x-2)/(x-2) = x+2. As x→2, limit = 4.',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: '0', isCorrect: false },
        { label: 'B', text: '2', isCorrect: false },
        { label: 'C', text: '4', isCorrect: true },
        { label: 'D', text: 'undefined', isCorrect: false },
      ],
    },
    {
      questionText: 'A function f is continuous at x = a if:',
      explanation: 'Continuity requires f(a) to exist, the limit to exist, and the limit to equal f(a).',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: 'f(a) is defined', isCorrect: false },
        { label: 'B', text: 'lim(x→a) f(x) exists', isCorrect: false },
        { label: 'C', text: 'lim(x→a) f(x) = f(a) and both exist', isCorrect: true },
        { label: 'D', text: 'f is differentiable at a', isCorrect: false },
      ],
    },
    {
      questionText: 'What is lim(x→0) sin(x)/x?',
      explanation: 'This is a fundamental limit: lim(x→0) sin(x)/x = 1.',
      difficulty: Difficulty.MEDIUM,
      options: [
        { label: 'A', text: '0', isCorrect: false },
        { label: 'B', text: '1', isCorrect: true },
        { label: 'C', text: '∞', isCorrect: false },
        { label: 'D', text: '-1', isCorrect: false },
      ],
    },
  ],

  'Differential Calculus': [
    {
      questionText: 'What is the derivative of f(x) = 3x⁴ - 2x² + 7?',
      explanation: 'Using the power rule: f\'(x) = 12x³ - 4x.',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: '12x³ - 4x', isCorrect: true },
        { label: 'B', text: '12x³ - 2x', isCorrect: false },
        { label: 'C', text: '3x³ - 2x', isCorrect: false },
        { label: 'D', text: '12x⁴ - 4x²', isCorrect: false },
      ],
    },
    {
      questionText: 'The derivative of sin(2x) is:',
      explanation: 'By chain rule: d/dx[sin(2x)] = cos(2x) × 2 = 2cos(2x).',
      difficulty: Difficulty.MEDIUM,
      options: [
        { label: 'A', text: 'cos(2x)', isCorrect: false },
        { label: 'B', text: '2cos(2x)', isCorrect: true },
        { label: 'C', text: '-2cos(2x)', isCorrect: false },
        { label: 'D', text: '2sin(2x)', isCorrect: false },
      ],
    },
    {
      questionText: 'If f(x) = eˣ · ln(x), then f\'(x) is:',
      explanation: 'Product rule: f\'(x) = eˣ·ln(x) + eˣ·(1/x) = eˣ(ln(x) + 1/x).',
      difficulty: Difficulty.HARD,
      options: [
        { label: 'A', text: 'eˣ/x', isCorrect: false },
        { label: 'B', text: 'eˣ · ln(x)', isCorrect: false },
        { label: 'C', text: 'eˣ(ln(x) + 1/x)', isCorrect: true },
        { label: 'D', text: 'eˣ(1 + ln(x))/x', isCorrect: false },
      ],
    },
  ],

  'Electromagnetic Induction': [
    {
      questionText: 'Faraday\'s law of electromagnetic induction states that the induced EMF is proportional to:',
      explanation: 'Faraday\'s law: EMF = -dΦ/dt, proportional to the rate of change of magnetic flux.',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: 'the magnetic field strength', isCorrect: false },
        { label: 'B', text: 'the rate of change of magnetic flux', isCorrect: true },
        { label: 'C', text: 'the area of the coil', isCorrect: false },
        { label: 'D', text: 'the resistance of the circuit', isCorrect: false },
      ],
    },
    {
      questionText: 'Lenz\'s law is a consequence of conservation of:',
      explanation: 'Lenz\'s law ensures the induced current opposes the change, conserving energy.',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: 'charge', isCorrect: false },
        { label: 'B', text: 'momentum', isCorrect: false },
        { label: 'C', text: 'energy', isCorrect: true },
        { label: 'D', text: 'mass', isCorrect: false },
      ],
    },
    {
      questionText: 'A coil of 200 turns has a flux change of 0.05 Wb in 0.1 seconds. The induced EMF is:',
      explanation: 'EMF = N × ΔΦ/Δt = 200 × 0.05/0.1 = 100 V.',
      difficulty: Difficulty.MEDIUM,
      options: [
        { label: 'A', text: '10 V', isCorrect: false },
        { label: 'B', text: '50 V', isCorrect: false },
        { label: 'C', text: '100 V', isCorrect: true },
        { label: 'D', text: '200 V', isCorrect: false },
      ],
    },
  ],

  'Atomic Physics': [
    {
      questionText: 'The energy of a photon is given by E = hf. If the frequency doubles, the energy:',
      explanation: 'E = hf is directly proportional to frequency. If f doubles, E doubles.',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: 'halves', isCorrect: false },
        { label: 'B', text: 'doubles', isCorrect: true },
        { label: 'C', text: 'quadruples', isCorrect: false },
        { label: 'D', text: 'stays the same', isCorrect: false },
      ],
    },
    {
      questionText: 'In Bohr\'s model, the radius of the nth orbit is proportional to:',
      explanation: 'In Bohr\'s model, rₙ = n²a₀, where a₀ is the Bohr radius. So rₙ ∝ n².',
      difficulty: Difficulty.MEDIUM,
      options: [
        { label: 'A', text: 'n', isCorrect: false },
        { label: 'B', text: 'n²', isCorrect: true },
        { label: 'C', text: '1/n', isCorrect: false },
        { label: 'D', text: '1/n²', isCorrect: false },
      ],
    },
    {
      questionText: 'The photoelectric effect demonstrates that light:',
      explanation: 'The photoelectric effect showed that light behaves as discrete particles (photons) with quantized energy.',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: 'is a continuous wave', isCorrect: false },
        { label: 'B', text: 'has particle-like properties', isCorrect: true },
        { label: 'C', text: 'travels faster in glass', isCorrect: false },
        { label: 'D', text: 'can be polarized', isCorrect: false },
      ],
    },
  ],

  'Organic Chemistry': [
    {
      questionText: 'The general formula for alkanes is:',
      explanation: 'Alkanes are saturated hydrocarbons with single bonds only. General formula CₙH₂ₙ₊₂.',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: 'CₙH₂ₙ', isCorrect: false },
        { label: 'B', text: 'CₙH₂ₙ₊₂', isCorrect: true },
        { label: 'C', text: 'CₙH₂ₙ₋₂', isCorrect: false },
        { label: 'D', text: 'CₙHₙ', isCorrect: false },
      ],
    },
    {
      questionText: 'Which functional group characterizes alcohols?',
      explanation: 'Alcohols contain the hydroxyl (-OH) functional group bonded to a carbon atom.',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: '-COOH', isCorrect: false },
        { label: 'B', text: '-OH', isCorrect: true },
        { label: 'C', text: '-CHO', isCorrect: false },
        { label: 'D', text: '-NH₂', isCorrect: false },
      ],
    },
    {
      questionText: 'What type of isomerism exists between ethanol (CH₃CH₂OH) and dimethyl ether (CH₃OCH₃)?',
      explanation: 'They have the same molecular formula C₂H₆O but different functional groups — functional group isomerism.',
      difficulty: Difficulty.MEDIUM,
      options: [
        { label: 'A', text: 'Chain isomerism', isCorrect: false },
        { label: 'B', text: 'Position isomerism', isCorrect: false },
        { label: 'C', text: 'Functional group isomerism', isCorrect: true },
        { label: 'D', text: 'Geometric isomerism', isCorrect: false },
      ],
    },
  ],

  'Electrochemistry': [
    {
      questionText: 'In an electrochemical cell, oxidation occurs at the:',
      explanation: 'By definition, oxidation (loss of electrons) occurs at the anode.',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: 'cathode', isCorrect: false },
        { label: 'B', text: 'anode', isCorrect: true },
        { label: 'C', text: 'salt bridge', isCorrect: false },
        { label: 'D', text: 'electrolyte', isCorrect: false },
      ],
    },
    {
      questionText: 'The standard electrode potential of hydrogen is:',
      explanation: 'The standard hydrogen electrode (SHE) is defined as 0.00 V by convention.',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: '-1.00 V', isCorrect: false },
        { label: 'B', text: '0.00 V', isCorrect: true },
        { label: 'C', text: '+1.00 V', isCorrect: false },
        { label: 'D', text: '+0.50 V', isCorrect: false },
      ],
    },
    {
      questionText: 'During electrolysis of dilute H₂SO₄, which gas is produced at the cathode?',
      explanation: 'At the cathode (reduction), H⁺ ions gain electrons: 2H⁺ + 2e⁻ → H₂.',
      difficulty: Difficulty.MEDIUM,
      options: [
        { label: 'A', text: 'Oxygen', isCorrect: false },
        { label: 'B', text: 'Hydrogen', isCorrect: true },
        { label: 'C', text: 'Sulfur dioxide', isCorrect: false },
        { label: 'D', text: 'Chlorine', isCorrect: false },
      ],
    },
  ],

  'Genetics and Heredity': [
    {
      questionText: 'In Mendel\'s monohybrid cross of Tt × Tt, the expected phenotypic ratio is:',
      explanation: 'Tt × Tt → TT:Tt:tt = 1:2:1 genotypic, 3:1 phenotypic (3 tall : 1 short).',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: '1:1', isCorrect: false },
        { label: 'B', text: '3:1', isCorrect: true },
        { label: 'C', text: '1:2:1', isCorrect: false },
        { label: 'D', text: '9:3:3:1', isCorrect: false },
      ],
    },
    {
      questionText: 'DNA replication is described as semi-conservative because:',
      explanation: 'Each new double helix contains one original strand and one newly synthesized strand.',
      difficulty: Difficulty.MEDIUM,
      options: [
        { label: 'A', text: 'both strands are new', isCorrect: false },
        { label: 'B', text: 'each new molecule has one old and one new strand', isCorrect: true },
        { label: 'C', text: 'only one strand is copied', isCorrect: false },
        { label: 'D', text: 'the entire molecule is conserved', isCorrect: false },
      ],
    },
    {
      questionText: 'A codon on mRNA consists of how many nucleotides?',
      explanation: 'Each codon is a triplet of three consecutive nucleotides that codes for one amino acid.',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: '1', isCorrect: false },
        { label: 'B', text: '2', isCorrect: false },
        { label: 'C', text: '3', isCorrect: true },
        { label: 'D', text: '4', isCorrect: false },
      ],
    },
  ],

  'Evolution': [
    {
      questionText: 'Natural selection acts on:',
      explanation: 'Natural selection acts on phenotypes (observable traits) of individuals, not directly on genotypes.',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: 'genotypes', isCorrect: false },
        { label: 'B', text: 'phenotypes', isCorrect: true },
        { label: 'C', text: 'mutations only', isCorrect: false },
        { label: 'D', text: 'populations as a whole', isCorrect: false },
      ],
    },
    {
      questionText: 'Homologous structures suggest that organisms:',
      explanation: 'Homologous structures (e.g., human arm, whale flipper) indicate shared ancestry.',
      difficulty: Difficulty.MEDIUM,
      options: [
        { label: 'A', text: 'live in the same environment', isCorrect: false },
        { label: 'B', text: 'share a common ancestor', isCorrect: true },
        { label: 'C', text: 'eat the same food', isCorrect: false },
        { label: 'D', text: 'have identical DNA', isCorrect: false },
      ],
    },
    {
      questionText: 'Which factor does NOT contribute to genetic variation?',
      explanation: 'Mitosis produces identical copies. Mutation, crossing over, and random fertilization produce variation.',
      difficulty: Difficulty.MEDIUM,
      options: [
        { label: 'A', text: 'Mutation', isCorrect: false },
        { label: 'B', text: 'Crossing over', isCorrect: false },
        { label: 'C', text: 'Mitosis', isCorrect: true },
        { label: 'D', text: 'Random fertilization', isCorrect: false },
      ],
    },
  ],

  'Reading Comprehension': [
    {
      questionText: 'The main purpose of a topic sentence in a paragraph is to:',
      explanation: 'A topic sentence states the main idea of the paragraph, guiding the reader.',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: 'provide supporting details', isCorrect: false },
        { label: 'B', text: 'state the main idea', isCorrect: true },
        { label: 'C', text: 'conclude the argument', isCorrect: false },
        { label: 'D', text: 'introduce a new topic', isCorrect: false },
      ],
    },
    {
      questionText: 'An inference is best described as:',
      explanation: 'An inference is a conclusion drawn from evidence and reasoning, not stated directly.',
      difficulty: Difficulty.MEDIUM,
      options: [
        { label: 'A', text: 'a direct quote from the text', isCorrect: false },
        { label: 'B', text: 'an opinion stated by the author', isCorrect: false },
        { label: 'C', text: 'a conclusion drawn from evidence', isCorrect: true },
        { label: 'D', text: 'a summary of the passage', isCorrect: false },
      ],
    },
    {
      questionText: 'Context clues help the reader to:',
      explanation: 'Context clues are hints in the surrounding text that help determine the meaning of unknown words.',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: 'identify the author', isCorrect: false },
        { label: 'B', text: 'determine the meaning of unfamiliar words', isCorrect: true },
        { label: 'C', text: 'find the page number', isCorrect: false },
        { label: 'D', text: 'predict the title', isCorrect: false },
      ],
    },
  ],

  'Grammar and Sentence Structure': [
    {
      questionText: 'Which sentence is grammatically correct?',
      explanation: '"Neither the students nor the teacher was aware" — "neither...nor" with the closer subject (teacher, singular) takes singular verb.',
      difficulty: Difficulty.MEDIUM,
      options: [
        { label: 'A', text: 'Neither the students nor the teacher were aware.', isCorrect: false },
        { label: 'B', text: 'Neither the students nor the teacher was aware.', isCorrect: true },
        { label: 'C', text: 'Neither the students or the teacher was aware.', isCorrect: false },
        { label: 'D', text: 'Neither the students nor the teacher are aware.', isCorrect: false },
      ],
    },
    {
      questionText: 'Identify the type of clause: "Although it was raining"',
      explanation: '"Although" introduces a dependent (subordinate) clause that cannot stand alone as a sentence.',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: 'Independent clause', isCorrect: false },
        { label: 'B', text: 'Dependent clause', isCorrect: true },
        { label: 'C', text: 'Noun clause', isCorrect: false },
        { label: 'D', text: 'Relative clause', isCorrect: false },
      ],
    },
    {
      questionText: 'The passive voice of "The cat chased the mouse" is:',
      explanation: 'In passive voice, the object becomes the subject: "The mouse was chased by the cat."',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', text: 'The mouse chased the cat.', isCorrect: false },
        { label: 'B', text: 'The mouse was chased by the cat.', isCorrect: true },
        { label: 'C', text: 'The cat was chased by the mouse.', isCorrect: false },
        { label: 'D', text: 'Chased was the mouse by the cat.', isCorrect: false },
      ],
    },
  ],
};

// ===========================================================================
// Seed execution
// ===========================================================================

async function seedStreams(): Promise<Map<StreamSlug, number>> {
  console.log('Seeding streams...');
  const streamIdMap = new Map<StreamSlug, number>();

  for (const s of STREAMS) {
    const stream = await prisma.stream.upsert({
      where: { slug: s.slug },
      update: { name: s.name },
      create: { name: s.name, slug: s.slug },
    });
    streamIdMap.set(s.slug, stream.id);
  }

  console.log(`  ✓ ${streamIdMap.size} streams`);
  return streamIdMap;
}

async function seedGrades(): Promise<Map<number, number>> {
  console.log('Seeding grades...');
  const gradeIdMap = new Map<number, number>();

  for (const num of GRADE_NUMBERS) {
    const grade = await prisma.grade.upsert({
      where: { gradeNumber: num },
      update: {},
      create: { gradeNumber: num },
    });
    gradeIdMap.set(num, grade.id);
  }

  console.log(`  ✓ ${gradeIdMap.size} grades`);
  return gradeIdMap;
}

async function seedSubjects(
  streamIdMap: Map<StreamSlug, number>,
): Promise<Map<string, number>> {
  console.log('Seeding subjects...');
  const subjectIdMap = new Map<string, number>();

  for (const s of SUBJECTS) {
    const subject = await prisma.subject.upsert({
      where: { name: s.name },
      update: {},
      create: { name: s.name },
    });
    subjectIdMap.set(s.name, subject.id);

    for (const streamSlug of s.streams) {
      const streamId = streamIdMap.get(streamSlug);
      if (!streamId) continue;

      await prisma.subjectStream.upsert({
        where: {
          subjectId_streamId: { subjectId: subject.id, streamId },
        },
        update: {},
        create: { subjectId: subject.id, streamId },
      });
    }
  }

  console.log(`  ✓ ${subjectIdMap.size} subjects with stream mappings`);
  return subjectIdMap;
}

async function seedTopics(
  subjectIdMap: Map<string, number>,
  gradeIdMap: Map<number, number>,
): Promise<Map<string, number>> {
  console.log('Seeding sample topics (grade 12)...');
  const topicIdMap = new Map<string, number>();
  const gradeId = gradeIdMap.get(12);
  if (!gradeId) throw new Error('Grade 12 not found in grade map');

  let count = 0;
  for (const entry of SAMPLE_TOPICS) {
    const subjectId = subjectIdMap.get(entry.subjectName);
    if (!subjectId) {
      console.warn(`  ⚠ Subject "${entry.subjectName}" not found, skipping`);
      continue;
    }

    for (let i = 0; i < entry.topics.length; i++) {
      const topicName = entry.topics[i]!;
      const existing = await prisma.topic.findFirst({
        where: { name: topicName, subjectId, gradeId },
      });

      if (existing) {
        topicIdMap.set(topicName, existing.id);
      } else {
        const topic = await prisma.topic.create({
          data: {
            name: topicName,
            subjectId,
            gradeId,
            sortOrder: i + 1,
          },
        });
        topicIdMap.set(topicName, topic.id);
      }
      count++;
    }
  }

  console.log(`  ✓ ${count} topics`);
  return topicIdMap;
}

async function seedQuestions(
  topicIdMap: Map<string, number>,
  gradeIdMap: Map<number, number>,
): Promise<string[]> {
  console.log('Seeding sample questions across all topics...');
  const gradeId = gradeIdMap.get(12);
  if (!gradeId) throw new Error('Grade 12 not found');

  let created = 0;
  let skipped = 0;
  const questionIds: string[] = [];

  for (const [topicName, questions] of Object.entries(QUESTIONS_BY_TOPIC)) {
    const topicId = topicIdMap.get(topicName);
    if (!topicId) {
      console.warn(`  ⚠ Topic "${topicName}" not in map, skipping`);
      continue;
    }

    for (const q of questions) {
      const exists = await prisma.question.findFirst({
        where: { questionText: q.questionText, topicId, gradeId },
      });

      if (exists) {
        questionIds.push(exists.id);
        skipped++;
        continue;
      }

      const question = await prisma.question.create({
        data: {
          questionText: q.questionText,
          explanation: q.explanation,
          difficulty: q.difficulty,
          status: QuestionStatus.PUBLISHED,
          topicId,
          gradeId,
          options: {
            create: q.options.map((o) => ({
              optionLabel: o.label,
              optionText: o.text,
              isCorrect: o.isCorrect,
            })),
          },
        },
      });
      questionIds.push(question.id);
      created++;
    }
  }

  console.log(`  ✓ ${created} questions created, ${skipped} already existed (${questionIds.length} total)`);
  return questionIds;
}

async function seedMockExams(
  subjectIdMap: Map<string, number>,
  gradeIdMap: Map<number, number>,
  questionIds: string[],
): Promise<void> {
  console.log('Seeding mock exams...');
  const gradeId = gradeIdMap.get(12);
  const mathSubjectId = subjectIdMap.get('Mathematics');
  const physicsSubjectId = subjectIdMap.get('Physics');
  if (!gradeId || !mathSubjectId || !physicsSubjectId) {
    console.warn('  ⚠ Missing grade or subject, skipping mock exams');
    return;
  }

  const mathQuestions = await prisma.question.findMany({
    where: {
      topic: { subjectId: mathSubjectId },
      gradeId,
      status: QuestionStatus.PUBLISHED,
      deletedAt: null,
    },
    take: 10,
    select: { id: true },
  });

  const physicsQuestions = await prisma.question.findMany({
    where: {
      topic: { subjectId: physicsSubjectId },
      gradeId,
      status: QuestionStatus.PUBLISHED,
      deletedAt: null,
    },
    take: 6,
    select: { id: true },
  });

  const exams = [
    {
      title: 'Mathematics Practice Exam 1',
      subjectId: mathSubjectId,
      durationMinutes: 45,
      questions: mathQuestions,
    },
    {
      title: 'Physics Practice Exam 1',
      subjectId: physicsSubjectId,
      durationMinutes: 30,
      questions: physicsQuestions,
    },
  ];

  let created = 0;
  for (const exam of exams) {
    if (exam.questions.length === 0) continue;

    const exists = await prisma.mockExam.findFirst({
      where: { title: exam.title, subjectId: exam.subjectId, gradeId },
    });
    if (exists) {
      console.log(`  – "${exam.title}" already exists, skipping`);
      continue;
    }

    await prisma.mockExam.create({
      data: {
        title: exam.title,
        subjectId: exam.subjectId,
        gradeId,
        durationMinutes: exam.durationMinutes,
        questionCount: exam.questions.length,
        mockExamQuestions: {
          create: exam.questions.map((q, i) => ({
            questionId: q.id,
            sortOrder: i + 1,
          })),
        },
      },
    });
    created++;
  }

  console.log(`  ✓ ${created} mock exams created`);
}

// ---------------------------------------------------------------------------
// Leaderboard seed — creates fake users with leaderboard entries
// ---------------------------------------------------------------------------
const FAKE_USERS = [
  { name: 'Abebe Bikila', email: 'abebe@example.com', phone: '+251911000001' },
  { name: 'Hiwot Tadesse', email: 'hiwot@example.com', phone: '+251911000002' },
  { name: 'Dawit Mengistu', email: 'dawit@example.com', phone: '+251911000003' },
  { name: 'Sara Bekele', email: 'sara@example.com', phone: '+251911000004' },
  { name: 'Yonas Alemu', email: 'yonas@example.com', phone: '+251911000005' },
  { name: 'Meron Haile', email: 'meron@example.com', phone: '+251911000006' },
  { name: 'Kidus Worku', email: 'kidus@example.com', phone: '+251911000007' },
  { name: 'Tigist Girma', email: 'tigist@example.com', phone: '+251911000008' },
  { name: 'Bereket Desta', email: 'bereket@example.com', phone: '+251911000009' },
  { name: 'Selam Abera', email: 'selam@example.com', phone: '+251911000010' },
  { name: 'Naod Tekle', email: 'naod@example.com', phone: '+251911000011' },
  { name: 'Bethlehem Assefa', email: 'bethlehem@example.com', phone: '+251911000012' },
  { name: 'Henok Kebede', email: 'henok@example.com', phone: '+251911000013' },
  { name: 'Liya Solomon', email: 'liya@example.com', phone: '+251911000014' },
  { name: 'Tewodros Yilma', email: 'tewodros@example.com', phone: '+251911000015' },
];

async function seedLeaderboard(): Promise<void> {
  console.log('Seeding leaderboard data...');
  const passwordHash = await bcrypt.hash('Test1234!', 10);
  let usersCreated = 0;
  let entriesCreated = 0;

  const periodToRedisKey: Record<string, string> = {
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    ALL_TIME: 'alltime',
  };

  for (const u of FAKE_USERS) {
    let user = await prisma.user.findUnique({ where: { email: u.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          phone: u.phone,
          passwordHash,
        },
      });
      usersCreated++;
    }

    const weeklyScore = Math.floor(Math.random() * 200) + 20;
    const monthlyScore = weeklyScore + Math.floor(Math.random() * 300) + 50;
    const allTimeScore = monthlyScore + Math.floor(Math.random() * 500) + 100;

    for (const [period, score] of [
      [LeaderboardPeriod.WEEKLY, weeklyScore],
      [LeaderboardPeriod.MONTHLY, monthlyScore],
      [LeaderboardPeriod.ALL_TIME, allTimeScore],
    ] as const) {
      const existing = await prisma.leaderboardEntry.findFirst({
        where: { userId: user.id, subjectId: null, period },
      });
      if (existing) {
        await prisma.leaderboardEntry.update({
          where: { id: existing.id },
          data: { score },
        });
      } else {
        await prisma.leaderboardEntry.create({
          data: { userId: user.id, score, period },
        });
      }

      const redisKey = `leaderboard:${periodToRedisKey[period]}:all`;
      await redis.zadd(redisKey, score, user.id);

      entriesCreated++;
    }
  }

  console.log(`  ✓ ${usersCreated} users created, ${entriesCreated} leaderboard entries (PostgreSQL + Redis)`);
}

async function main(): Promise<void> {
  console.log('=== Starting database seed ===\n');

  const streamIdMap = await seedStreams();
  const gradeIdMap = await seedGrades();
  const subjectIdMap = await seedSubjects(streamIdMap);
  const topicIdMap = await seedTopics(subjectIdMap, gradeIdMap);
  const questionIds = await seedQuestions(topicIdMap, gradeIdMap);
  await seedMockExams(subjectIdMap, gradeIdMap, questionIds);
  await seedLeaderboard();

  console.log('\n=== Seed complete ===');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await redis.quit();
    await prisma.$disconnect();
  });
