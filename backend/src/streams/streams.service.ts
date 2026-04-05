import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CacheService } from '../common/cache';

const CACHE_TTL_STREAMS = 300; // 5 minutes
const CACHE_KEY_ALL = 'streams:all';

@Injectable()
export class StreamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Return all streams with their subjects nested inside.
   *
   * Prisma's `include` works like a SQL JOIN — it fetches related
   * records in a single query. Here we go two levels deep:
   * Stream → SubjectStream (join table) → Subject
   */
  async findAll() {
    return this.cache.getOrSet(CACHE_KEY_ALL, CACHE_TTL_STREAMS, async () => {
      const streams = await this.prisma.stream.findMany({
        include: {
          subjects: {
            include: { subject: true },
            orderBy: { subject: { name: 'asc' } },
          },
        },
        orderBy: { name: 'asc' },
      });

      return streams.map((stream) => ({
        id: stream.id,
        name: stream.name,
        slug: stream.slug,
        subjects: stream.subjects.map((ss) => ({
          id: ss.subject.id,
          name: ss.subject.name,
          icon: ss.subject.icon,
        })),
      }));
    });
  }
}
