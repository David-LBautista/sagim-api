import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@/shared/enums';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route
 * Usage: @Roles(UserRole.ADMIN, UserRole.DIF)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
