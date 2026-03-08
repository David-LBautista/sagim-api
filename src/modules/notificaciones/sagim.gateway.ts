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
import { JwtService } from '@nestjs/jwt';
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
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);

      if (!payload?.municipioId) {
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
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 [WS] Cliente desconectado: ${client.id}`);
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
