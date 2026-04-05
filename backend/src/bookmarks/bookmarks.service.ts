import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all bookmarks for a user, with the full question and its topic/subject
   * included so the frontend can display useful context without extra calls.
   *
   * Optional filters let the user narrow down their bookmarks by subject
   * or grade — useful when they're studying a specific area.
   */
  async findAll(userId: string, subjectId?: number, gradeId?: number) {
    return this.prisma.bookmark.findMany({
      where: {
        userId,
        question: {
          deletedAt: null,
          ...(gradeId ? { gradeId } : {}),
          ...(subjectId ? { topic: { subjectId } } : {}),
        },
      },
      include: {
        question: {
          select: {
            id: true,
            questionText: true,
            difficulty: true,
            gradeId: true,
            topic: {
              select: {
                id: true,
                name: true,
                subject: { select: { id: true, name: true } },
              },
            },
            grade: { select: { id: true, gradeNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /**
   * Bookmark a question.
   *
   * The database has a unique constraint on (userId, questionId), so if
   * the user tries to bookmark the same question twice, Prisma throws a
   * P2002 error (unique constraint violation). We catch that and return
   * a friendly 409 Conflict instead of a generic 500 error.
   */
  async create(userId: string, questionId: string) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, deletedAt: null, status: 'PUBLISHED' },
    });

    if (!question) {
      throw new NotFoundException(`Question ${questionId} not found`);
    }

    try {
      return await this.prisma.bookmark.create({
        data: { userId, questionId },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Question is already bookmarked');
      }
      throw error;
    }
  }

  /**
   * Remove a bookmark. We verify the bookmark belongs to the requesting
   * user — a user should not be able to delete another user's bookmarks.
   */
  async remove(userId: string, bookmarkId: string) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: { id: bookmarkId },
    });

    if (!bookmark || bookmark.userId !== userId) {
      throw new NotFoundException(`Bookmark ${bookmarkId} not found`);
    }

    await this.prisma.bookmark.delete({ where: { id: bookmarkId } });

    return { message: 'Bookmark removed' };
  }
}
