import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Get the current user from the request
 * Usage: @CurrentUser() user: UserDocument
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

/**
 * Get the municipality ID from the current user
 * Usage: @MunicipalityId() municipioId: string
 */
export const MunicipalityId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.municipioId;
  },
);

/**
 * Get the user ID from the current user
 * Usage: @UserId() userId: string
 */
export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.sub || request.user?._id;
  },
);
