import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';

/**
 * Rooms disponibles:
 *  - municipio:{id}                   → todos los usuarios del municipio (tesorería, dashboard)
 *  - municipio:{id}:area:{slug}       → un departamento específico (registro_civil, secretaria, dif, etc.)
 *
 * El cliente se une automáticamente al room general al conectar.
 * Para recibir solo eventos de su área, el cliente emite 'join:area'.
 */
@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/sagim',
  pingInterval: 25000, // ping cada 25s para mantener conexión viva ante proxies/load balancers
  pingTimeout: 10000, // si no responde en 10s, se considera caído y reconecta
})
export class SagimGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SagimGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`[WS] Conexión rechazada: sin token (${client.id})`);
        client.emit('auth:error', { message: 'Token requerido' });
        client.disconnect();
        return;
      }

      let payload: any;
      try {
        payload = this.jwtService.verify(token);
      } catch (err) {
        if (err instanceof TokenExpiredError) {
          this.logger.warn(
            `[WS] Token expirado para socket ${client.id} — esperando refresh`,
          );
          // No desconectar: dejar el socket vivo para que el cliente haga
          // POST /auth/refresh y luego emita 'auth:token' con el nuevo access token.
          // Si no llega en 30 s, se cierra automáticamente.
          client.data.pendingAuth = true;
          client.emit('auth:token-expired', {
            message:
              'Access token expirado. Envía el nuevo token con auth:token',
          });
          client.data.pendingAuthTimeout = setTimeout(() => {
            if (client.data.pendingAuth) {
              this.logger.warn(
                `[WS] Timeout de re-auth para socket ${client.id} — desconectando`,
              );
              client.disconnect();
            }
          }, 30_000);
        } else {
          this.logger.warn(
            `[WS] Token inválido para socket ${client.id}: ${(err as Error).message}`,
          );
          client.emit('auth:error', { message: 'Token inválido' });
          client.disconnect();
        }
        return;
      }

      if (!payload?.municipioId) {
        this.logger.warn(`[WS] Token sin municipioId para socket ${client.id}`);
        client.emit('auth:error', { message: 'Token sin municipio' });
        client.disconnect();
        return;
      }

      // Guardar contexto en el socket para usarlo en join:area
      client.data.municipioId = payload.municipioId;
      client.data.email = payload.email;

      // Unir siempre al room general del municipio
      const roomGeneral = `municipio:${payload.municipioId}`;
      await client.join(roomGeneral);

      // Auto-join al room del módulo si el token lo incluye (rol OPERATIVO)
      if (payload.moduloNombre) {
        const slug = this.areaToSlug(payload.moduloNombre);
        const roomArea = `municipio:${payload.municipioId}:area:${slug}`;
        await client.join(roomArea);
        client.data.areaRoom = roomArea;
        this.logger.log(
          `🔌 [WS] ${payload.email} conectado → ${roomGeneral} + ${roomArea}`,
        );
      } else {
        this.logger.log(
          `🔌 [WS] ${payload.email} conectado → room ${roomGeneral}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `[WS] Error inesperado en handleConnection (${client.id}): ${(err as Error).message}`,
      );
      client.emit('auth:error', { message: 'Error interno al conectar' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    clearTimeout(client.data.pendingAuthTimeout);
    this.logger.log(`🔌 [WS] Cliente desconectado: ${client.id}`);
  }

  /**
   * El cliente emite 'auth:token' con el nuevo access token obtenido del
   * endpoint POST /auth/refresh, sin necesidad de reconectar el socket.
   *
   * Flujo esperado en el front-end:
   *   socket.on('auth:token-expired', async () => {
   *     const { accessToken } = await api.post('/auth/refresh', { refreshToken });
   *     socket.emit('auth:token', { token: accessToken });
   *   });
   */
  @SubscribeMessage('auth:token')
  async handleAuthToken(
    @MessageBody() data: { token: string },
    @ConnectedSocket() client: Socket,
  ) {
    clearTimeout(client.data.pendingAuthTimeout);

    if (!data?.token) {
      client.emit('auth:error', { message: 'Token requerido' });
      client.disconnect();
      return;
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(data.token);
    } catch (err) {
      this.logger.warn(
        `[WS] Re-auth fallida para socket ${client.id}: ${(err as Error).message}`,
      );
      client.emit('auth:error', { message: 'Token inválido en re-auth' });
      client.disconnect();
      return;
    }

    if (!payload?.municipioId) {
      client.emit('auth:error', { message: 'Token sin municipio' });
      client.disconnect();
      return;
    }

    client.data.pendingAuth = false;
    client.data.municipioId = payload.municipioId;
    client.data.email = payload.email;

    const roomGeneral = `municipio:${payload.municipioId}`;
    await client.join(roomGeneral);

    if (payload.moduloNombre) {
      const slug = this.areaToSlug(payload.moduloNombre);
      const roomArea = `municipio:${payload.municipioId}:area:${slug}`;
      await client.join(roomArea);
      client.data.areaRoom = roomArea;
      this.logger.log(
        `🔄 [WS] Re-auth OK: ${payload.email} → ${roomGeneral} + ${roomArea}`,
      );
    } else {
      this.logger.log(`🔄 [WS] Re-auth OK: ${payload.email} → ${roomGeneral}`);
    }

    client.emit('auth:ok', { message: 'Re-autenticado correctamente' });
  }

  /**
   * El cliente emite 'join:area' con el nombre del área para recibir
   * notificaciones específicas de ese departamento.
   *
   * Ejemplo Angular:
   *   socket.emit('join:area', 'Registro Civil');
   *   socket.emit('join:area', 'DIF');
   *   socket.emit('join:area', 'SECRETARIA_AYUNTAMIENTO');
   */
  @SubscribeMessage('join:area')
  async handleJoinArea(
    @MessageBody() area: string,
    @ConnectedSocket() client: Socket,
  ) {
    const municipioId = client.data?.municipioId;
    if (!municipioId || !area) return;

    const slug = this.areaToSlug(area);
    const room = `municipio:${municipioId}:area:${slug}`;
    await client.join(room);

    this.logger.log(`📌 [WS] ${client.data.email} → room ${room}`);

    return { joined: room };
  }

  /**
   * El cliente puede salir de un room de área (al cambiar de sección).
   */
  @SubscribeMessage('leave:area')
  async handleLeaveArea(
    @MessageBody() area: string,
    @ConnectedSocket() client: Socket,
  ) {
    const municipioId = client.data?.municipioId;
    if (!municipioId || !area) return;

    const slug = this.areaToSlug(area);
    const room = `municipio:${municipioId}:area:${slug}`;
    await client.leave(room);
  }

  // ==================== EVENTOS EMITIDOS POR EL SERVIDOR ====================

  /**
   * Orden interna pagada en caja.
   * → Solo al room del área que la generó (Registro Civil, DIF, Secretaría...)
   */
  emitOrdenPagada(
    municipioId: string,
    data: {
      folioOrden: string;
      ciudadano: string;
      servicio: string;
      areaResponsable?: string;
      monto: number;
      timestamp: Date;
    },
  ) {
    if (data.areaResponsable) {
      const slug = this.areaToSlug(data.areaResponsable);
      this.server
        .to(`municipio:${municipioId}:area:${slug}`)
        .emit('orden:pagada', data);
    } else {
      // Sin área definida → broadcast al municipio completo
      this.server.to(`municipio:${municipioId}`).emit('orden:pagada', data);
    }

    this.logger.log(
      `📡 [WS] orden:pagada → ` +
        (data.areaResponsable
          ? `municipio:${municipioId}:area:${this.areaToSlug(data.areaResponsable)}`
          : `municipio:${municipioId}`) +
        ` | Folio: ${data.folioOrden}`,
    );
  }

  /**
   * Nueva orden interna creada por un departamento.
   * → Room de TESORERIA para que el cajero sepa que hay una nueva orden.
   */
  emitOrdenCreada(
    municipioId: string,
    data: {
      ordenId: string;
      folioOrden: string;
      ciudadano: string;
      servicio: string;
      areaResponsable?: string;
      monto: number;
      timestamp: Date;
    },
  ) {
    this.server
      .to(`municipio:${municipioId}:area:tesoreria`)
      .emit('orden:creada', data);

    this.logger.log(
      `📡 [WS] orden:creada → municipio:${municipioId}:area:tesoreria | Folio: ${data.folioOrden}`,
    );
  }

  /**
   * Nuevo pago registrado en caja.
   * → Room de TESORERIA (dashboard de caja / corte diario).
   */
  emitPagoCaja(
    municipioId: string,
    data: {
      folio: string;
      servicio: string;
      ciudadano: string;
      monto: number;
      metodoPago: string;
      timestamp: Date;
    },
  ) {
    this.server
      .to(`municipio:${municipioId}:area:tesoreria`)
      .emit('caja:nuevo-pago', data);
  }

  /**
   * Snapshot completo del dashboard de tesoería.
   * → Room de TESORERIA — el frontend actualiza tarjetas + gráficas sin hacer HTTP.
   */
  emitDashboardTesoreriaUpdate(
    municipioId: string,
    snapshot: {
      resumen: any;
      serviciosTop: any[];
      ingresosPorArea: any[];
    },
  ) {
    this.server
      .to(`municipio:${municipioId}:area:tesoreria`)
      .emit('tesoreria:dashboard-update', snapshot);
  }

  /**
   * Snapshot completo del dashboard presidencial.
   * → Room general del municipio — actualiza todas las secciones sin HTTP.
   */
  emitDashboardPresidencialUpdate(municipioId: string, snapshot: any) {
    this.server
      .to(`municipio:${municipioId}`)
      .emit('presidencial:dashboard-update', snapshot);
  }

  /**
   * Actividad reciente del día para el dashboard presidencial.
   * → Room general del municipio (presidencia, super-admin).
   */
  emitActividadReciente(
    municipioId: string,
    data: {
      folio: string;
      servicio: string;
      ciudadano: string;
      monto: number;
      canal: string; // 'Caja' | 'En línea'
      timestamp: Date;
    },
  ) {
    this.server
      .to(`municipio:${municipioId}`)
      .emit('tesoreria:actividad', data);

    this.logger.log(
      `📡 [WS] tesoreria:actividad → municipio:${municipioId} | Folio: ${data.folio}`,
    );
  }

  /**
   * Alerta de baja recaudación.
   * → Room de TESORERIA.
   */
  emitAlertaBajaRecaudacion(
    municipioId: string,
    data: { mensaje: string; recaudado: number; meta: number },
  ) {
    this.server
      .to(`municipio:${municipioId}:area:tesoreria`)
      .emit('alerta:baja-recaudacion', data);
  }

  /**
   * Alerta de stock crítico en DIF.
   * → Room de DIF.
   */
  emitAlertaStockCritico(
    municipioId: string,
    data: { programa: string; stockActual: number; stockMinimo: number },
  ) {
    this.server
      .to(`municipio:${municipioId}:area:dif`)
      .emit('alerta:stock-critico', data);
  }

  /**
   * Alerta global — visible para todo el municipio (presidencia, dashboard).
   */
  emitAlertaGlobal(
    municipioId: string,
    data: { tipo: string; mensaje: string; [key: string]: any },
  ) {
    this.server.to(`municipio:${municipioId}`).emit('alerta', data);
  }

  // ==================== EVENTOS DE CITAS ====================

  /**
   * Nueva cita agendada (pública o desde recepción).
   * → Room del área responsable + room general del municipio.
   */
  emitNuevaCita(
    municipioId: string,
    data: {
      folio: string;
      area: string;
      tramite: string;
      fechaCita: Date;
      horario: string;
      ciudadano: string;
      origen: 'publico' | 'recepcion';
    },
  ) {
    const slug = this.areaToSlug(data.area);
    const roomArea = `municipio:${municipioId}:area:${slug}`;
    this.server.to(roomArea).emit('cita:nueva', data);
    this.server.to(`municipio:${municipioId}`).emit('cita:nueva', data);
    this.logger.log(
      `📡 [WS] cita:nueva → ${roomArea} | ${data.folio} (${data.origen})`,
    );
  }

  /**
   * Cita cancelada (por ciudadano o funcionario).
   * → Room del área responsable.
   */
  emitCitaCancelada(
    municipioId: string,
    data: {
      folio: string;
      area: string;
      fechaCita: Date;
      horario: string;
      ciudadano: string;
      canceladoPor: 'ciudadano' | 'funcionario';
      motivo?: string;
    },
  ) {
    const slug = this.areaToSlug(data.area);
    const roomArea = `municipio:${municipioId}:area:${slug}`;
    this.server.to(roomArea).emit('cita:cancelada', data);
    this.logger.log(`📡 [WS] cita:cancelada → ${roomArea} | ${data.folio}`);
  }

  /**
   * Estado de cita actualizado (confirmada, atendida, no_asistio, reagendada).
   * → Room del área responsable.
   */
  emitCitaActualizada(
    municipioId: string,
    data: {
      folio: string;
      area: string;
      fechaCita: Date;
      horario: string;
      ciudadano: string;
      estado: string;
    },
  ) {
    const slug = this.areaToSlug(data.area);
    const roomArea = `municipio:${municipioId}:area:${slug}`;
    this.server.to(roomArea).emit('cita:actualizada', data);
    this.logger.log(
      `📡 [WS] cita:actualizada → ${roomArea} | ${data.folio} → ${data.estado}`,
    );
  }

  // ==================== HELPERS ====================

  /** Normaliza el nombre de un área a un slug para el room de Socket.IO */
  private areaToSlug(area: string): string {
    return area
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quitar tildes
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }
}
