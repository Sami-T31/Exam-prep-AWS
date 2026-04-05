import { Difficulty, PrismaClient, QuestionStatus } from '@prisma/client';

const prisma = new PrismaClient();

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;
const DIFFICULTIES = [
  Difficulty.EASY,
  Difficulty.MEDIUM,
  Difficulty.HARD,
] as const;

function parsePerTopic(): number {
  const arg = process.argv.find((entry) => entry.startsWith('--per-topic='));
  if (!arg) return 6;

  const parsed = Number(arg.split('=')[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) return 6;
  return Math.floor(parsed);
}

function createBatchId(): string {
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

async function main() {
  const perTopic = parsePerTopic();
  const batchId = createBatchId();

  console.log('=== Bulk test-question publisher ===');
  console.log(`Batch ID: ${batchId}`);
  console.log(`Questions per topic: ${perTopic}`);

  const topics = await prisma.topic.findMany({
    include: {
      subject: {
        select: {
          id: true,
          name: true,
        },
      },
      grade: {
        select: {
          id: true,
          gradeNumber: true,
        },
      },
    },
    orderBy: [{ subjectId: 'asc' }, { gradeId: 'asc' }, { sortOrder: 'asc' }],
  });

  if (topics.length === 0) {
    console.log('No topics found. Nothing to publish.');
    return;
  }

  let totalCreated = 0;
  const createdBySubject = new Map<string, number>();

  for (const topic of topics) {
    for (let index = 0; index < perTopic; index += 1) {
      const correctIndex = (topic.id + index) % OPTION_LABELS.length;
      const difficulty =
        DIFFICULTIES[(topic.id + index) % DIFFICULTIES.length] ??
        Difficulty.EASY;

      await prisma.question.create({
        data: {
          questionText: `[TEST ${batchId}] ${topic.subject.name} - ${topic.name} - Grade ${topic.grade.gradeNumber} - Item ${index + 1}`,
          explanation: `Auto-generated test question for UI and load testing. Correct option: ${OPTION_LABELS[correctIndex]}.`,
          difficulty,
          status: QuestionStatus.PUBLISHED,
          topicId: topic.id,
          gradeId: topic.grade.id,
          year: 2026,
          options: {
            create: OPTION_LABELS.map((label, optionIndex) => ({
              optionLabel: label,
              optionText: `${label}) Test option ${optionIndex + 1} for ${topic.name}`,
              isCorrect: optionIndex === correctIndex,
            })),
          },
        },
      });

      totalCreated += 1;
      const previousCount = createdBySubject.get(topic.subject.name) ?? 0;
      createdBySubject.set(topic.subject.name, previousCount + 1);
    }
  }

  console.log(`Created ${totalCreated} published test questions.`);
  console.log('Created by subject:');
  for (const [subject, count] of [...createdBySubject.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    console.log(`  - ${subject}: ${count}`);
  }
  console.log('=== Done ===');
}

main()
  .catch((error) => {
    console.error('Bulk publish failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
