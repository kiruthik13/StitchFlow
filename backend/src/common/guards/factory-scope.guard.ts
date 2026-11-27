import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../types/auth-user.type';

/**
 * Enforces multi-factory isolation at the API layer.
 * Any route containing :factoryId, ?factoryId=, or body.factoryId
 * is verified against the authenticated user's authorized factory scope.
 */
@Injectable()
export class FactoryScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (!user) return false;

    const requestedFactoryId: string | undefined =
      request.params?.factoryId ||
      request.params?.id && (request.baseUrl?.includes('/factories') || request.originalUrl?.includes('/factories') || request.path?.includes('/factories'))
        ? request.params?.id || request.params?.factoryId
        : request.query?.factoryId || request.body?.factoryId;

    if (!requestedFactoryId) return true;

    // MD with CAN_VIEW_ALL_FACTORIES can view factories within their own organization
    // (factory-to-organization ownership is further verified in SQL queries / RLS).
    if (user.role === 'md' && user.permissions.includes('CAN_VIEW_ALL_FACTORIES')) {
      return true;
    }

    if (!user.assignedFactoryIds.includes(requestedFactoryId)) {
      throw new ForbiddenException({
        errorCode: 'ERR_FORBIDDEN_CROSS_FACTORY',
        message: 'Access denied for requested factory scope',
      });
    }

    return true;
  }
}
