import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  UpdateProfileDto,
  ChangePasswordDto,
  UpdatePreferencesDto,
  RegisterDeviceTokenDto,
} from './dto';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/users/me
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: RequestUser) {
    return this.usersService.getProfile(user.id);
  }

  /**
   * PUT /api/v1/users/me
   */
  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiConflictResponse({ description: 'Phone number already in use' })
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  /**
   * POST /api/v1/users/me/change-password
   */
  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password (requires current password)' })
  @ApiUnauthorizedResponse({ description: 'Current password is incorrect' })
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  /**
   * GET /api/v1/users/me/preferences
   */
  @Get('me/preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  async getPreferences(@CurrentUser() user: RequestUser) {
    return this.usersService.getPreferences(user.id);
  }

  /**
   * PUT /api/v1/users/me/preferences
   */
  @Put('me/preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  async updatePreferences(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.usersService.updatePreferences(user.id, dto);
  }

  /**
   * POST /api/v1/users/me/device-token
   */
  @Post('me/device-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register a push notification device token' })
  @ApiOkResponse({ description: 'Device token registered' })
  async registerDeviceToken(
    @CurrentUser() user: RequestUser,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.usersService.registerDeviceToken(
      user.id,
      dto.deviceToken,
      dto.platform,
    );
  }
}
