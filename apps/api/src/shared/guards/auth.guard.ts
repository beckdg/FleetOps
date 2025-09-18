import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Placeholder authentication guard.
 * Will be extended when the auth module is implemented.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}
