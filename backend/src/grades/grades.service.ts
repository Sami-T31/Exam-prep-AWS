import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CacheService } from '../common/cache';

const CACHE_TTL_GRADES = 600; // 10 minutes
const CACHE_KEY_ALL = 'grades:all';

@Injectable()
export class GradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findAll() {
    return this.cache.getOrSet(CACHE_KEY_ALL, CACHE_TTL_GRADES, async () => {
      return this.prisma.grade.findMany({
        orderBy: { gradeNumber: 'asc' },
      });
    });
  }
}
