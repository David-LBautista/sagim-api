import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extrae el slug del municipio desde el subdominio del Host header.
 *
 * Ejemplos:
 *   laperla.sagim.com.mx  → "laperla"
 *   veracruz.sagim.com.mx → "veracruz"
 *
 * Fallback para desarrollo local / Postman:
 *   Header  X-Municipio-Slug: laperla
 */
export const MunicipioSlug = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ headers: Record<string, string> }>();
    const host: string = request.headers['host'] ?? '';

    // laperla.sagim.com.mx → laperla
    const subdomain = host.split('.')[0];

    // Si el subdomain parece un hostname local (localhost, 127, etc.) usa el header de fallback
    if (
      !subdomain ||
      subdomain === 'localhost' ||
      subdomain === '127' ||
      subdomain === 'api'
    ) {
      return (request.headers['x-municipio-slug'] ?? '') as string;
    }

    return subdomain;
  },
);
