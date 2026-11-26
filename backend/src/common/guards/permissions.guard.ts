import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/auth.decorators';
import { AuthenticatedUser } from '../types/auth-user.type';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (!user) {
      throw new ForbiddenException({
        errorCode: 'ERR_FORBIDDEN',
        message: 'Authentication required',
      });
    }

    const hasAll = required.every((perm) => user.permissions.includes(perm));
    if (!hasAll) {
      throw new ForbiddenException({
        errorCode: 'ERR_INSUFFICIENT_PERMISSION',
        message: 'You do not have permission to perform this action',
      });
    }
    return true;
  }
}
