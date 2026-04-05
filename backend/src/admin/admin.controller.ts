import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { UpdateUserSubscriptionDto, UserListQueryDto } from './dto';

@ApiTags('Admin')
@Controller('admin')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Admin: dashboard overview metrics' })
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('users')
  @ApiOperation({ summary: 'Admin: list users with optional search and pagination' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  listUsers(@Query() query: UserListQueryDto) {
    return this.adminService.listUsers(
      query.search,
      query.limit ?? 20,
      query.offset ?? 0,
    );
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Admin: get user details and activity' })
  @ApiParam({ name: 'id', type: String, description: 'User UUID' })
  getUserDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/subscription')
  @ApiOperation({ summary: 'Admin: manually activate or deactivate user subscription' })
  @ApiParam({ name: 'id', type: String, description: 'User UUID' })
  updateUserSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserSubscriptionDto,
  ) {
    return this.adminService.updateUserSubscription(
      id,
      body.action,
      body.plan,
      body.durationDays,
    );
  }
}
