import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { InspectionResponseDto } from './dto/inspection-response.dto';
import { InspectionService } from './inspections.service';

@ApiTags('Inspections')
@ApiBearerAuth()
@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionService: InspectionService) {}

  @Post()
  @RequirePermission('maintenance', 'write')
  @ApiOperation({ summary: 'Record a vehicle inspection' })
  @ApiCreatedResponse({ type: InspectionResponseDto })
  createInspection(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInspectionDto,
  ): Promise<InspectionResponseDto> {
    return this.inspectionService.createInspection({
      organizationId: user.organizationId,
      createdByUserId: user.userId,
      ...dto,
    });
  }

  @Get()
  @RequirePermission('maintenance', 'read')
  @ApiOperation({ summary: 'List organization inspections' })
  @ApiOkResponse({ type: InspectionResponseDto, isArray: true })
  listInspections(@CurrentUser() user: AuthenticatedUser): Promise<InspectionResponseDto[]> {
    return this.inspectionService.findByOrganization(user.organizationId);
  }
}
