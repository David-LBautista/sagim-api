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
 *
 * Resolution order:
 *  1. request.params.municipioId
 *  2. request.body.municipioId
 *  3. request.query.municipioId
 *  4. request.user.municipioId  (ADMIN_MUNICIPIO / OPERATIVO — set by JWT)
 */
export const MunicipalityId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request.params?.municipioId ||
      request.body?.municipioId ||
      request.query?.municipioId ||
      request.user?.municipioId
    );
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
