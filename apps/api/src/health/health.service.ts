import { Injectable } from '@nestjs/common';
import { HealthCheckResponse } from '@fleetops/shared-types';

import { APP_NAME } from '../shared/constants/app.constants';

@Injectable()
export class HealthService {
  getHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      service: APP_NAME,
    };
  }
}
