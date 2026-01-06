import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';
import { MarkAllReadResponseDto, UpdateNotificationPreferenceDto } from './dto/notification.dto';
import {
  NotificationPreferenceResponseDto,
  NotificationResponseDto,
} from './dto/notification-response.dto';
import { NotificationPreferenceService } from './notification-preferences.service';
import { NotificationService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationPreferenceService: NotificationPreferenceService,
  ) {}

  @Get('notifications')
  @RequirePermission('notifications', 'read')
  @ApiOperation({ summary: 'List notifications for the current user' })
  @ApiOkResponse({ type: NotificationResponseDto, isArray: true })
  listNotifications(@CurrentUser() user: AuthenticatedUser): Promise<NotificationResponseDto[]> {
    return this.notificationService.getNotifications(user.organizationId, user.userId);
  }

  @Get('notifications/unread')
  @RequirePermission('notifications', 'read')
  @ApiOperation({ summary: 'List unread notifications for the current user' })
  @ApiOkResponse({ type: NotificationResponseDto, isArray: true })
  listUnreadNotifications(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationResponseDto[]> {
    return this.notificationService.getUnreadNotifications(user.organizationId, user.userId);
  }

  @Post('notifications/:notificationId/read')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('notifications', 'write')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiOkResponse({ type: NotificationResponseDto })
  markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ): Promise<NotificationResponseDto> {
    return this.notificationService.markAsRead(user.organizationId, user.userId, notificationId);
  }

  @Post('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('notifications', 'write')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiOkResponse({ type: MarkAllReadResponseDto })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser): Promise<MarkAllReadResponseDto> {
    const readCount = await this.notificationService.markAllAsRead(
      user.organizationId,
      user.userId,
    );

    return { readCount };
  }

  @Get('notification-preferences')
  @RequirePermission('notifications', 'read')
  @ApiOperation({ summary: 'Get notification preferences for the current user' })
  @ApiOkResponse({ type: NotificationPreferenceResponseDto })
  getPreferences(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.notificationPreferenceService.getPreferences(user.organizationId, user.userId);
  }

  @Patch('notification-preferences')
  @RequirePermission('notifications', 'write')
  @ApiOperation({ summary: 'Update notification preferences for the current user' })
  @ApiOkResponse({ type: NotificationPreferenceResponseDto })
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.notificationPreferenceService.updatePreferences(
      user.organizationId,
      user.userId,
      dto,
    );
  }
}
