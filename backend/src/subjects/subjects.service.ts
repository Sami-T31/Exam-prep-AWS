import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CacheService } from '../common/cache';
import {
  requireSanitizedText,
  sanitizeNullableTextInput,
} from '../common/utils/sanitize';

const CACHE_TTL_SUBJECTS = 300; // 5 minutes
const CACHE_KEY_ALL = 'subjects:all';
const CACHE_KEY_SINGLE = (id: number) => `subjects:${id}`;

@Injectable()
export class SubjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findAll() {
    return this.cache.getOrSet(CACHE_KEY_ALL, CACHE_TTL_SUBJECTS, async () => {
      const subjects = await this.prisma.subject.findMany({
        include: {
          streams: { include: { stream: true } },
        },
        orderBy: { name: 'asc' },
      });

      return subjects.map((s) => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
        streams: s.streams.map((ss) => ss.stream.slug),
      }));
    });
  }

  async findOne(id: number) {
    return this.cache.getOrSet(CACHE_KEY_SINGLE(id), CACHE_TTL_SUBJECTS, async () => {
      const subject = await this.prisma.subject.findUnique({
        where: { id },
        include: {
          streams: { include: { stream: true } },
          topics: {
            include: { grade: true },
            orderBy: [{ grade: { gradeNumber: 'asc' } }, { sortOrder: 'asc' }],
          },
        },
      });

      if (!subject) {
        throw new NotFoundException(`Subject with ID ${id} not found`);
      }

      return {
        id: subject.id,
        name: subject.name,
        icon: subject.icon,
        streams: subject.streams.map((ss) => ss.stream.slug),
        topics: subject.topics.map((t) => ({
          id: t.id,
          name: t.name,
          gradeId: t.gradeId,
          gradeNumber: t.grade.gradeNumber,
          sortOrder: t.sortOrder,
        })),
      };
    });
  }

  async findAllAdmin() {
    const subjects = await this.prisma.subject.findMany({
      include: {
        streams: true,
      },
      orderBy: { name: 'asc' },
    });

    return subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      icon: subject.icon,
      streamIds: subject.streams.map((item) => item.streamId),
    }));
  }

  async createAdmin(dto: { name: string; icon?: string; streamIds: number[] }) {
    const sanitizedName = requireSanitizedText(dto.name, 'Subject name');
    const sanitizedIcon = sanitizeNullableTextInput(dto.icon);
    const distinctStreamIds = Array.from(new Set(dto.streamIds));
    const streams = await this.prisma.stream.findMany({
      where: { id: { in: distinctStreamIds } },
      select: { id: true },
    });
    if (streams.length !== distinctStreamIds.length) {
      throw new BadRequestException('One or more streams do not exist');
    }

    const created = await this.prisma.subject.create({
      data: {
        name: sanitizedName,
        icon: sanitizedIcon,
        streams: {
          create: distinctStreamIds.map((streamId) => ({ streamId })),
        },
      },
      include: {
        streams: true,
      },
    });
    await this.invalidateSubjectCaches();
    return created;
  }

  async updateAdmin(
    id: number,
    dto: { name?: string; icon?: string; streamIds?: number[] },
  ) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) {
      throw new NotFoundException(`Subject with ID ${id} not found`);
    }

    if (dto.streamIds) {
      const distinctStreamIds = Array.from(new Set(dto.streamIds));
      const streams = await this.prisma.stream.findMany({
        where: { id: { in: distinctStreamIds } },
        select: { id: true },
      });
      if (streams.length !== distinctStreamIds.length) {
        throw new BadRequestException('One or more streams do not exist');
      }

      await this.prisma.subjectStream.deleteMany({ where: { subjectId: id } });
      await this.prisma.subjectStream.createMany({
        data: distinctStreamIds.map((streamId) => ({ subjectId: id, streamId })),
      });
    }

    const updated = await this.prisma.subject.update({
      where: { id },
      data: {
        ...(dto.name !== undefined
          ? { name: requireSanitizedText(dto.name, 'Subject name') }
          : {}),
        ...(dto.icon !== undefined
          ? { icon: sanitizeNullableTextInput(dto.icon) }
          : {}),
      },
      include: { streams: true },
    });
    await this.invalidateSubjectCaches(id);
    return updated;
  }

  async removeAdmin(id: number) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) {
      throw new NotFoundException(`Subject with ID ${id} not found`);
    }

    const topicCount = await this.prisma.topic.count({ where: { subjectId: id } });
    if (topicCount > 0) {
      throw new BadRequestException('Cannot delete subject with existing topics');
    }

    await this.prisma.subject.delete({ where: { id } });
    await this.invalidateSubjectCaches(id);
    return { message: 'Subject deleted successfully' };
  }

  private async invalidateSubjectCaches(id?: number): Promise<void> {
    await this.cache.invalidate(CACHE_KEY_ALL);
    if (id !== undefined) {
      await this.cache.invalidate(CACHE_KEY_SINGLE(id));
    }
    await this.cache.invalidate('streams:all');
  }
}
