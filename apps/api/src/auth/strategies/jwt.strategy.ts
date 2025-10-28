import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UserRepository } from '../../users/users.repository';
import { EnvironmentVariables } from '../../shared/constants/env.validation';
import { JWT_STRATEGY_NAME } from '../constants/auth.constants';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_STRATEGY_NAME) {
  constructor(
    configService: ConfigService<EnvironmentVariables, true>,
    private readonly userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', { infer: true }),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (user.organizationId !== payload.organizationId || user.email !== payload.email) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    return {
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      roleIds: payload.roleIds,
    };
  }
}
