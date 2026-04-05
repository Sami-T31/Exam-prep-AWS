import { Difficulty, PrismaClient, QuestionStatus } from '@prisma/client';

const prisma = new PrismaClient();

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;
const DIFFICULTY_CYCLE = [
  Difficulty.EASY,
  Difficulty.MEDIUM,
  Difficulty.HARD,
] as const;

function parseNumberArg(flag: string, fallback: number): number {
  const arg = process.argv.find((entry) => entry.startsWith(`${flag}=`));
  if (!arg) return fallback;
  const parsed = Number(arg.split('=')[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function createBatchId(): string {
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

function buildGeneratedExplanation(correctLabel: string): string {
  return `Auto-generated question for full-coverage testing. Correct option: ${correctLabel}.`;
}

async function ensureTopicsForAllPairs(
  topicsPerPair: number,
): Promise<number> {
  const subjects = await prisma.subject.findMany({
    orderBy: { id: 'asc' },
  });
  const grades = await prisma.grade.findMany({
    orderBy: { gradeNumber: 'asc' },
  });

  let createdTopics = 0;

  for (const subject of subjects) {
    for (const grade of grades) {
      const existingTopics = await prisma.topic.findMany({
        where: {
          subjectId: subject.id,
          gradeId: grade.id,
        },
        orderBy: { sortOrder: 'asc' },
      });

      if (existingTopics.length > 0) {
        continue;
      }

      for (let index = 1; index <= topicsPerPair; index += 1) {
        await prisma.topic.create({
          data: {
            name: `Chapter ${index}`,
            subjectId: subject.id,
            gradeId: grade.id,
            sortOrder: index,
          },
        });
        createdTopics += 1;
      }
    }
  }

  return createdTopics;
}

async function seedQuestionsForEveryTopic(
  questionsPerTopic: number,
  batchId: string,
): Promise<{
  createdQuestions: number;
  toppedUpTopics: number;
}> {
  const topics = await prisma.topic.findMany({
    include: {
      subject: {
        select: {
          name: true,
        },
      },
      grade: {
        select: {
          gradeNumber: true,
        },
      },
    },
    orderBy: [{ subjectId: 'asc' }, { gradeId: 'asc' }, { sortOrder: 'asc' }],
  });

  let createdQuestions = 0;
  let toppedUpTopics = 0;

  for (const topic of topics) {
    const publishedCount = await prisma.question.count({
      where: {
        topicId: topic.id,
        gradeId: topic.gradeId,
        status: QuestionStatus.PUBLISHED,
        deletedAt: null,
      },
    });

    const missingCount = Math.max(0, questionsPerTopic - publishedCount);
    if (missingCount === 0) continue;

    toppedUpTopics += 1;

    for (let index = 0; index < missingCount; index += 1) {
      const sequence = publishedCount + index + 1;
      const correctIndex = (topic.id + sequence) % OPTION_LABELS.length;
      const correctLabel = OPTION_LABELS[correctIndex] ?? OPTION_LABELS[0];
      const difficulty =
        DIFFICULTY_CYCLE[(topic.id + sequence) % DIFFICULTY_CYCLE.length] ??
        Difficulty.EASY;

      await prisma.question.create({
        data: {
          questionText: `[AUTO ${batchId}] ${topic.subject.name} - Grade ${topic.grade.gradeNumber} - ${topic.name} - Q${sequence}`,
          explanation: buildGeneratedExplanation(correctLabel),
          difficulty,
          status: QuestionStatus.PUBLISHED,
          topicId: topic.id,
          gradeId: topic.gradeId,
          year: 2026,
          options: {
            create: OPTION_LABELS.map((label, optionIndex) => ({
              optionLabel: label,
              optionText: `${label}) Practice option ${optionIndex + 1} for ${topic.name}`,
              isCorrect: optionIndex === correctIndex,
            })),
          },
        },
      });

      createdQuestions += 1;
    }
  }

  return {
    createdQuestions,
    toppedUpTopics,
  };
}

async function main() {
  const topicsPerPair = parseNumberArg('--topics-per-pair', 15);
  const questionsPerTopic = parseNumberArg('--questions-per-topic', 6);
  const batchId = createBatchId();

  console.log('=== Full subject/grade question population ===');
  console.log(`Batch ID: ${batchId}`);
  console.log(`Topics per subject+grade when missing: ${topicsPerPair}`);
  console.log(`Minimum published questions per topic: ${questionsPerTopic}`);

  const createdTopics = await ensureTopicsForAllPairs(topicsPerPair);
  const questionResult = await seedQuestionsForEveryTopic(
    questionsPerTopic,
    batchId,
  );

  const publishedQuestions = await prisma.question.count({
    where: {
      status: QuestionStatus.PUBLISHED,
      deletedAt: null,
    },
  });
  const totalTopics = await prisma.topic.count();

  console.log(`Created topics: ${createdTopics}`);
  console.log(`Topped-up topics: ${questionResult.toppedUpTopics}`);
  console.log(`Created questions: ${questionResult.createdQuestions}`);
  console.log(`Total topics now: ${totalTopics}`);
  console.log(`Total published questions now: ${publishedQuestions}`);
  console.log('=== Done ===');
}

main()
  .catch((error) => {
    console.error('Population failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
