import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import * as bcrypt from 'bcryptjs';
import {
  requireSanitizedText,
  sanitizeTextInput,
} from '../common/utils/sanitize';

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // GET PROFILE
  // =========================================================================

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        region: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // =========================================================================
  // UPDATE PROFILE
  // =========================================================================

  async updateProfile(
    userId: string,
    data: { name?: string; phone?: string; region?: string },
  ) {
    const updateData: Record<string, string> = {};

    if (data.name !== undefined) {
      updateData.name = requireSanitizedText(data.name, 'Name');
    }

    if (data.phone !== undefined) {
      const normalizedPhone = sanitizeTextInput(data.phone);
      // Check uniqueness
      const existing = await this.prisma.user.findFirst({
        where: { phone: normalizedPhone, deletedAt: null, id: { not: userId } },
      });
      if (existing) {
        throw new ConflictException(
          'An account with this phone number already exists',
        );
      }
      updateData.phone = normalizedPhone;
    }

    if (data.region !== undefined) {
      updateData.region = sanitizeTextInput(data.region);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        region: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  // =========================================================================
  // CHANGE PASSWORD
  // =========================================================================

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      }),
      // Invalidate all refresh tokens to force re-login on other devices
      this.prisma.refreshToken.deleteMany({
        where: { userId },
      }),
    ]);
  }

  // =========================================================================
  // PREFERENCES
  // =========================================================================

  async getPreferences(userId: string) {
    let prefs = await this.prisma.userPreference.findUnique({
      where: { userId },
      select: {
        notificationsEnabled: true,
        dailyReminderEnabled: true,
        dailyReminderTime: true,
        preferredLanguage: true,
      },
    });

    if (!prefs) {
      prefs = await this.prisma.userPreference.create({
        data: { userId },
        select: {
          notificationsEnabled: true,
          dailyReminderEnabled: true,
          dailyReminderTime: true,
          preferredLanguage: true,
        },
      });
    }

    return prefs;
  }

  async updatePreferences(
    userId: string,
    data: {
      notificationsEnabled?: boolean;
      dailyReminderEnabled?: boolean;
      dailyReminderTime?: string;
      preferredLanguage?: string;
    },
  ) {
    const prefs = await this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      select: {
        notificationsEnabled: true,
        dailyReminderEnabled: true,
        dailyReminderTime: true,
        preferredLanguage: true,
      },
    });

    return prefs;
  }

  // =========================================================================
  // DEVICE TOKEN
  // =========================================================================

  async registerDeviceToken(
    userId: string,
    deviceToken: string,
    platform: 'IOS' | 'ANDROID',
  ) {
    const token = await this.prisma.deviceToken.upsert({
      where: {
        userId_token: { userId, token: deviceToken },
      },
      create: {
        userId,
        token: deviceToken,
        platform,
      },
      update: {
        platform,
      },
      select: {
        id: true,
        token: true,
        platform: true,
        createdAt: true,
      },
    });

    return token;
  }
}
