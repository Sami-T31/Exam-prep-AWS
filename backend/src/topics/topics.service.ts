import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { requireSanitizedText } from '../common/utils/sanitize';

@Injectable()
export class TopicsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get topics for a specific subject, optionally filtered by grade.
   *
   * Prisma's `where` clause builds a SQL WHERE dynamically.
   * If gradeId is undefined, Prisma simply omits that condition.
   * This pattern avoids messy if/else chains for optional filters.
   */
  async findBySubject(subjectId: number, gradeId?: number) {
    return this.prisma.topic.findMany({
      where: {
        subjectId,
        ...(gradeId !== undefined ? { gradeId } : {}),
      },
      include: { grade: true },
      orderBy: [{ grade: { gradeNumber: 'asc' } }, { sortOrder: 'asc' }],
    });
  }

  async findAllAdmin(subjectId?: number) {
    return this.prisma.topic.findMany({
      where: {
        ...(subjectId ? { subjectId } : {}),
      },
      include: {
        subject: { select: { id: true, name: true } },
        grade: { select: { id: true, gradeNumber: true } },
      },
      orderBy: [{ subjectId: 'asc' }, { grade: { gradeNumber: 'asc' } }, { sortOrder: 'asc' }],
    });
  }

  async createAdmin(dto: {
    name: string;
    subjectId: number;
    gradeId: number;
    sortOrder?: number;
  }) {
    const sanitizedName = requireSanitizedText(dto.name, 'Topic name');
    const [subject, grade] = await Promise.all([
      this.prisma.subject.findUnique({ where: { id: dto.subjectId } }),
      this.prisma.grade.findUnique({ where: { id: dto.gradeId } }),
    ]);
    if (!subject) {
      throw new BadRequestException(`Subject ${dto.subjectId} not found`);
    }
    if (!grade) {
      throw new BadRequestException(`Grade ${dto.gradeId} not found`);
    }

    return this.prisma.topic.create({
      data: {
        name: sanitizedName,
        subjectId: dto.subjectId,
        gradeId: dto.gradeId,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: {
        subject: { select: { id: true, name: true } },
        grade: { select: { id: true, gradeNumber: true } },
      },
    });
  }

  async updateAdmin(
    id: number,
    dto: {
      name?: string;
      subjectId?: number;
      gradeId?: number;
      sortOrder?: number;
    },
  ) {
    const existing = await this.prisma.topic.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Topic ${id} not found`);
    }

    if (dto.subjectId) {
      const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
      if (!subject) {
        throw new BadRequestException(`Subject ${dto.subjectId} not found`);
      }
    }
    if (dto.gradeId) {
      const grade = await this.prisma.grade.findUnique({ where: { id: dto.gradeId } });
      if (!grade) {
        throw new BadRequestException(`Grade ${dto.gradeId} not found`);
      }
    }

    return this.prisma.topic.update({
      where: { id },
      data: {
        ...(dto.name !== undefined
          ? { name: requireSanitizedText(dto.name, 'Topic name') }
          : {}),
        ...(dto.subjectId !== undefined ? { subjectId: dto.subjectId } : {}),
        ...(dto.gradeId !== undefined ? { gradeId: dto.gradeId } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
      include: {
        subject: { select: { id: true, name: true } },
        grade: { select: { id: true, gradeNumber: true } },
      },
    });
  }

  async removeAdmin(id: number) {
    const existing = await this.prisma.topic.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Topic ${id} not found`);
    }

    const questionCount = await this.prisma.question.count({
      where: { topicId: id, deletedAt: null },
    });
    if (questionCount > 0) {
      throw new BadRequestException('Cannot delete topic with existing questions');
    }

    await this.prisma.topic.delete({ where: { id } });
    return { message: 'Topic deleted successfully' };
  }
}
