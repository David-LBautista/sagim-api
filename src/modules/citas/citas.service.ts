import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { randomUUID } from 'crypto';
import * as dayjs from 'dayjs';

import { fecha, TIMEZONE_MEXICO } from '../../common/helpers/fecha.helper';

import {
  CitaConfiguracion,
  CitaConfiguracionDocument,
} from './schemas/cita-configuracion.schema';
import { Cita, CitaDocument, EstadoCita } from './schemas/cita.schema';
import {
  CitaBloqueo,
  CitaBloqueoDocument,
} from './schemas/cita-bloqueo.schema';
import {
  SlotDisponible,
  DisponibilidadDia,
} from './interfaces/citas.interfaces';
import {
  CreateCitaConfiguracionDto,
  UpdateCitaConfiguracionDto,
  CreateBloqueoDto,
  CrearCitaPublicaDto,
  CambiarEstadoCitaDto,
  ReagendarCitaDto,
} from './dto/citas.dto';
import {
  Municipality,
  MunicipalityDocument,
} from '../municipalities/schemas/municipality.schema';
import {
  Ciudadano,
  CiudadanoDocument,
} from '../ciudadanos/schemas/ciudadano.schema';
import { Counter, CounterDocument } from '../dif/schemas/counter.schema';
import { SagimGateway } from '../notificaciones/sagim.gateway';

const DIA_SEMANA: Record<number, string> = {
  0: 'domingo',
  1: 'lunes',
  2: 'martes',
  3: 'miercoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sabado',
};

@Injectable()
export class CitasService {
  private readonly logger = new Logger(CitasService.name);
  private readonly resend: Resend;
  private readonly emailFrom: string;
  private readonly frontendUrl: string;

  constructor(
    @InjectModel(CitaConfiguracion.name)
    private citaConfigModel: Model<CitaConfiguracionDocument>,
    @InjectModel(Cita.name)
    private citaModel: Model<CitaDocument>,
    @InjectModel(CitaBloqueo.name)
    private bloqueoModel: Model<CitaBloqueoDocument>,
    @InjectModel(Municipality.name)
    private municipioModel: Model<MunicipalityDocument>,
    @InjectModel(Ciudadano.name)
    private ciudadanoModel: Model<CiudadanoDocument>,
    @InjectModel(Counter.name)
    private counterModel: Model<CounterDocument>,
    private readonly configService: ConfigService,
    private readonly sagimGateway: SagimGateway,
  ) {
    this.resend = new Resend(configService.get<string>('RESEND_API_KEY'));
    this.emailFrom =
      configService.get<string>('EMAIL_FROM') ?? 'noreply@sagim.mx';
    this.frontendUrl =
      configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS PRIVADOS
  // ═══════════════════════════════════════════════════════════

  /** Resuelve municipio por claveInegi (slug) o nombre normalizado */
  async resolverMunicipio(
    slug: string,
  ): Promise<{ _id: unknown; nombre: string; claveInegi?: string }> {
    const municipio = await this.municipioModel
      .findOne({
        $or: [
          { claveInegi: slug },
          { nombre: { $regex: `^${slug.replace(/-/g, ' ')}$`, $options: 'i' } },
        ],
        activo: true,
      })
      .lean()
      .exec();

    if (!municipio) {
      throw new NotFoundException(`Municipio "${slug}" no encontrado`);
    }
    return municipio as { _id: unknown; nombre: string; claveInegi?: string };
  }

  /** Genera folio CIT-YYMM-XXXX único por municipio (contador atómico) */
  private async generarFolio(municipioId: string): Promise<string> {
    const now = fecha.ahoraEnMexico();
    const yy = String(now.year()).slice(-2);
    const mm = String(now.month() + 1).padStart(2, '0');
    const yymm = `${yy}${mm}`;
    const munShort = municipioId.toString().slice(-4).toUpperCase();
    const counterId = `cit-${munShort}-${yymm}`;
    const prefijo = `CIT-${yymm}-`;

    const counter = await this.counterModel.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );

    let seq = counter.seq;

    // Primera vez que se usa el contador este mes: verificar si ya existen folios
    // creados por el algoritmo anterior (regex) para no generar duplicados.
    if (seq === 1) {
      const ultima = await this.citaModel
        .findOne({
          municipioId: new Types.ObjectId(municipioId),
          folio: { $regex: `^${prefijo}` },
        })
        .sort({ folio: -1 })
        .lean();

      if (ultima?.folio) {
        const lastSeq = parseInt(ultima.folio.split('-').at(-1)!, 10);
        if (!isNaN(lastSeq) && lastSeq >= 1) {
          // Usar $max para llevar el contador al valor correcto
          // (si otro proceso ya lo incrementó no lo bajamos)
          await this.counterModel.updateOne(
            { _id: counterId },
            { $max: { seq: lastSeq } },
          );
          const bumped = await this.counterModel.findOneAndUpdate(
            { _id: counterId },
            { $inc: { seq: 1 } },
            { new: true },
          );
          seq = bumped!.seq;
        }
      }
    }

    return `CIT-${yymm}-${seq.toString().padStart(4, '0')}`;
  }

  /** Genera los slots de tiempo dados un bloque de inicio-fin y duración en min */
  private generarSlots(
    inicio: string,
    fin: string,
    duracionMin: number,
  ): string[] {
    const slots: string[] = [];
    const [hIni, mIni] = inicio.split(':').map(Number);
    const [hFin, mFin] = fin.split(':').map(Number);
    let minutos = hIni * 60 + mIni;
    const finMin = hFin * 60 + mFin;

    while (minutos < finMin) {
      const h = Math.floor(minutos / 60);
      const m = minutos % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      minutos += duracionMin;
    }
    return slots;
  }

  /** Verifica si una fecha cae en algún bloqueo activo (CitaBloqueo o diasBloqueados) */
  private async esDiaBloqueado(
    municipioId: string,
    area: string,
    fechaDia: Date,
    config: CitaConfiguracionDocument,
  ): Promise<boolean> {
    // Verificar diasBloqueados del config (fechas exactas por día)
    const fechaStr = fecha.utcAMexico(fechaDia).format('YYYY-MM-DD');
    const bloqueadoEnConfig = (config.diasBloqueados ?? []).some((d) => {
      return fecha.utcAMexico(d).format('YYYY-MM-DD') === fechaStr;
    });
    if (bloqueadoEnConfig) return true;

    // Verificar CitaBloqueo (rangos)
    const inicioDia = fecha.inicioDia(fechaDia);
    const finDia = fecha.finDia(fechaDia);

    const bloqueo = await this.bloqueoModel.findOne({
      municipioId: new Types.ObjectId(municipioId),
      area,
      fechaInicio: { $lte: finDia },
      fechaFin: { $gte: inicioDia },
    });

    return !!bloqueo;
  }

  /** @deprecated Reemplazado por reservarSlot (contador atómico). Conservado sólo para referencia. */
  private async slotDisponible(
    municipioId: string,
    area: string,
    fechaDia: Date,
    horario: string,
    capacidad: number,
  ): Promise<boolean> {
    const inicioDia = fecha.inicioDia(fechaDia);
    const finDia = fecha.finDia(fechaDia);

    const count = await this.citaModel.countDocuments({
      municipioId: new Types.ObjectId(municipioId),
      area,
      fechaCita: { $gte: inicioDia, $lte: finDia },
      horario,
      estado: { $nin: ['cancelada'] },
    });
    return count < capacidad;
  }

  /** Clave única de slot para el contador atómico de reservas */
  private buildSlotKey(
    municipioId: string,
    area: string,
    fechaDia: Date,
    horario: string,
  ): string {
    const fechaStr = dayjs(fechaDia).tz(TIMEZONE_MEXICO).format('YYYYMMDD');
    const areaNorm = area.replace(/\s+/g, '_').toLowerCase();
    return `slot:${municipioId}:${areaNorm}:${fechaStr}:${horario.replace(':', '')}`;
  }

  /**
   * Reserva un slot de forma atómica usando el counterModel.
   * Dos solicitudes concurrentes al mismo slot obtendrán valores distintos del $inc,
   * eliminando la TOCTOU race condition del countDocuments → create.
   * Lanza ConflictException si la capacidad ya está cubierta.
   */
  private async reservarSlot(
    municipioId: string,
    area: string,
    fechaDia: Date,
    horario: string,
    capacidad: number,
  ): Promise<void> {
    const key = this.buildSlotKey(municipioId, area, fechaDia, horario);
    const doc = await this.counterModel.findOneAndUpdate(
      { _id: key },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );
    if (doc.seq > capacidad) {
      // Revertir el incremento y rechazar
      await this.counterModel.updateOne({ _id: key }, { $inc: { seq: -1 } });
      throw new ConflictException(
        'El horario seleccionado ya no está disponible',
      );
    }
  }

  /**
   * Libera un slot (cancelación, reagendación o error).
   * Idempotente: nunca reduce el contador por debajo de cero.
   */
  private async liberarSlot(
    municipioId: string,
    area: string,
    fechaDia: Date,
    horario: string,
  ): Promise<void> {
    const key = this.buildSlotKey(municipioId, area, fechaDia, horario);
    await this.counterModel.updateOne(
      { _id: key, seq: { $gt: 0 } },
      { $inc: { seq: -1 } },
    );
  }

  // ═══════════════════════════════════════════════════════════
  // PÚBLICOS — PORTAL CIUDADANO
  // ═══════════════════════════════════════════════════════════

  /** GET /public/:slug/citas/areas */
  async getAreasActivas(municipioId: string) {
    const configs = await this.citaConfigModel
      .find({ municipioId: new Types.ObjectId(municipioId), activo: true })
      .sort({ area: 1 })
      .lean();

    return configs.map((c) => ({
      area: c.area,
      modulo: c.modulo,
      instrucciones: c.instrucciones,
      tramites: c.tramites ?? [],
    }));
  }

  /** GET /public/:slug/citas/disponibilidad */
  async getDisponibilidad(
    municipioId: string,
    area: string,
    fechaInicio: string,
    fechaFin: string,
  ): Promise<DisponibilidadDia[]> {
    const config = await this.citaConfigModel
      .findOne({
        municipioId: new Types.ObjectId(municipioId),
        area,
        activo: true,
      })
      .exec();

    if (!config) {
      throw new NotFoundException(
        `No hay configuración activa de citas para "${area}"`,
      );
    }

    const duracion = config.duracionSlotMinutos ?? 30;
    const inicioRango = dayjs
      .tz(fechaInicio, 'YYYY-MM-DD', TIMEZONE_MEXICO)
      .startOf('day');
    const finRango = dayjs
      .tz(fechaFin, 'YYYY-MM-DD', TIMEZONE_MEXICO)
      .endOf('day');

    // ── Pre-cargar en 2 queries paralelas en lugar de 1 por día/slot ────────
    const [bloqueos, citasAgg] = await Promise.all([
      // Todos los bloqueos que se solapan con el rango
      this.bloqueoModel
        .find({
          municipioId: new Types.ObjectId(municipioId),
          area,
          fechaInicio: { $lte: finRango.utc().toDate() },
          fechaFin: { $gte: inicioRango.utc().toDate() },
        })
        .lean(),
      // Ocupación agrupada por día+horario para todo el rango
      this.citaModel.aggregate([
        {
          $match: {
            municipioId: new Types.ObjectId(municipioId),
            area,
            fechaCita: {
              $gte: inicioRango.utc().toDate(),
              $lte: finRango.utc().toDate(),
            },
            estado: { $nin: ['cancelada'] },
          },
        },
        {
          $group: {
            _id: {
              fecha: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$fechaCita',
                  timezone: TIMEZONE_MEXICO,
                },
              },
              horario: '$horario',
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Mapa ocupación: "YYYY-MM-DD|HH:mm" → número de citas
    const ocupacionMap = new Map<string, number>(
      citasAgg.map((x: any) => [`${x._id.fecha}|${x._id.horario}`, x.count]),
    );

    // Set de días bloqueados del config (fechas exactas)
    const diasBloqueadosConfig = new Set(
      (config.diasBloqueados ?? []).map((d) =>
        fecha.utcAMexico(d).format('YYYY-MM-DD'),
      ),
    );

    // Verificación de bloqueo completamente en memoria
    const tieneBloqueoDia = (diaJS: dayjs.Dayjs): boolean => {
      const inicioDia = diaJS.utc().toDate();
      const finDia = diaJS.endOf('day').utc().toDate();
      return bloqueos.some(
        (b) =>
          new Date(b.fechaInicio) <= finDia &&
          new Date(b.fechaFin) >= inicioDia,
      );
    };

    // ── Loop sin queries adicionales ─────────────────────────────────────────
    const resultado: DisponibilidadDia[] = [];
    let current = inicioRango;

    while (!current.isAfter(finRango.startOf('day'))) {
      const fechaStr = current.format('YYYY-MM-DD');
      const nombreDia = DIA_SEMANA[current.day()];
      const horarioDia = config.horarios?.find(
        (h) => h.dia === nombreDia && h.activo,
      );

      if (
        !horarioDia?.bloques?.length ||
        diasBloqueadosConfig.has(fechaStr) ||
        tieneBloqueoDia(current)
      ) {
        resultado.push({ fecha: fechaStr, disponible: false, slots: [] });
        current = current.add(1, 'day');
        continue;
      }

      const todosSlots: SlotDisponible[] = [];
      for (const bloque of horarioDia.bloques) {
        const slots = this.generarSlots(bloque.inicio, bloque.fin, duracion);
        const capacidad = bloque.capacidadPorSlot ?? 1;
        for (const horario of slots) {
          const citasAgendadas =
            ocupacionMap.get(`${fechaStr}|${horario}`) ?? 0;
          const lugaresRestantes = Math.max(0, capacidad - citasAgendadas);
          todosSlots.push({
            horario,
            disponible: lugaresRestantes > 0,
            capacidadTotal: capacidad,
            citasAgendadas,
            lugaresRestantes,
          });
        }
      }

      resultado.push({
        fecha: fechaStr,
        disponible: todosSlots.some((s) => s.disponible),
        slots: todosSlots,
      });

      current = current.add(1, 'day');
    }

    return resultado;
  }

  /** POST /public/:slug/citas — Crear cita desde portal */
  async crearCitaPublica(
    municipioId: string,
    dto: CrearCitaPublicaDto,
    municipioNombre: string,
    municipioSlug = '',
  ) {
    const config = await this.citaConfigModel
      .findOne({
        municipioId: new Types.ObjectId(municipioId),
        area: dto.area,
        activo: true,
      })
      .exec();

    if (!config) {
      throw new NotFoundException(
        `No hay citas activas para el área "${dto.area}"`,
      );
    }

    // Parsear la fecha en zona horaria México
    const fechaCitaMX = dayjs
      .tz(dto.fechaCita, 'YYYY-MM-DD', TIMEZONE_MEXICO)
      .startOf('day');
    const fechaCitaDate = fechaCitaMX.toDate();

    // 1. Validar anticipación
    const hoyMX = fecha.ahoraEnMexico().startOf('day');
    const diasDiferencia = fechaCitaMX.diff(hoyMX, 'day');
    if (diasDiferencia < (config.diasAnticipacionMinima ?? 0)) {
      throw new BadRequestException(
        `Debe agendar con al menos ${config.diasAnticipacionMinima} día(s) de anticipación`,
      );
    }
    if (diasDiferencia > (config.diasAnticipacionMaxima ?? 30)) {
      throw new BadRequestException(
        `Solo puede agendar con un máximo de ${config.diasAnticipacionMaxima} días de anticipación`,
      );
    }

    // 2. Verificar que el día no esté bloqueado
    if (
      await this.esDiaBloqueado(municipioId, dto.area, fechaCitaDate, config)
    ) {
      throw new ConflictException('El día seleccionado no está disponible');
    }

    // 3. Obtener capacidad del slot
    const nombreDia = DIA_SEMANA[fechaCitaMX.day()];
    const horarioDia = config.horarios?.find(
      (h) => h.dia === nombreDia && h.activo,
    );
    if (!horarioDia) {
      throw new ConflictException('El área no atiende ese día de la semana');
    }

    let capacidadSlot = 1;
    for (const bloque of horarioDia.bloques ?? []) {
      const slots = this.generarSlots(
        bloque.inicio,
        bloque.fin,
        config.duracionSlotMinutos ?? 30,
      );
      if (slots.includes(dto.horario)) {
        capacidadSlot = bloque.capacidadPorSlot ?? 1;
        break;
      }
    }

    // 4. Reservar slot atómicamente — el $inc en counterModel serializa solicitudes
    //    concurrentes, eliminando la TOCTOU race condition del check → create.
    await this.reservarSlot(
      municipioId,
      dto.area,
      fechaCitaDate,
      dto.horario,
      capacidadSlot,
    );

    // 5. Verificar que la CURP no tenga cita activa en este área
    const curpUpper = dto.curp.toUpperCase();
    const citaExistente = await this.citaModel.findOne({
      municipioId: new Types.ObjectId(municipioId),
      area: dto.area,
      'ciudadano.curp': curpUpper,
      estado: { $in: ['pendiente', 'confirmada'] },
    });
    if (citaExistente) {
      await this.liberarSlot(municipioId, dto.area, fechaCitaDate, dto.horario);
      throw new ConflictException(
        `Ya tienes una cita activa (${citaExistente.folio}) para "${dto.area}"`,
      );
    }

    // 6. Buscar o crear ciudadano en el padrón
    let ciudadanoId: Types.ObjectId | undefined;
    let ciudadanoNuevo = false;

    const ciudadanoExistente = await this.ciudadanoModel.findOne({
      curp: curpUpper,
      municipioId: new Types.ObjectId(municipioId),
    });

    if (ciudadanoExistente) {
      ciudadanoId = ciudadanoExistente._id as Types.ObjectId;
    } else if (dto.curp.length === 18) {
      // Crear registro básico en el padrón
      const nuevo = await this.ciudadanoModel.create({
        curp: curpUpper,
        nombre: dto.nombreCompleto.split(' ')[0],
        apellidoPaterno: dto.nombreCompleto.split(' ')[1] ?? '',
        apellidoMaterno: dto.nombreCompleto.split(' ')[2] ?? '',
        telefono: dto.telefono,
        email: dto.correo,
        municipioId: new Types.ObjectId(municipioId),
        origen: 'portal_citas',
        activo: true,
      });
      ciudadanoId = nuevo._id as Types.ObjectId;
      ciudadanoNuevo = true;
    }

    // 7. Crear la cita (con retry en caso de colisión de folio)
    const tokenConsulta = randomUUID();

    // Construir fechaCita con hora incluida en zona México → UTC
    const [hh, mm] = dto.horario.split(':').map(Number);
    const fechaCitaConHora = fechaCitaMX
      .hour(hh)
      .minute(mm)
      .second(0)
      .millisecond(0)
      .utc()
      .toDate();

    let cita: CitaDocument;
    let attempts = 0;
    while (true) {
      const folio = await this.generarFolio(municipioId);
      try {
        cita = await this.citaModel.create({
          folio,
          municipioId: new Types.ObjectId(municipioId),
          area: dto.area,
          modulo: config.modulo,
          tramite: dto.tramite,
          servicioId: dto.servicioId
            ? new Types.ObjectId(dto.servicioId)
            : undefined,
          fechaCita: fechaCitaConHora,
          horario: dto.horario,
          ciudadano: {
            ciudadanoId,
            nombreCompleto: dto.nombreCompleto.toUpperCase(),
            curp: curpUpper,
            telefono: dto.telefono,
            correo: dto.correo ?? '',
            ciudadanoNuevo,
          },
          estado: 'pendiente' as EstadoCita,
          notasCiudadano: dto.notasCiudadano ?? '',
          origen: 'portal_publico',
          tokenConsulta,
          recordatorioEnviado: false,
        });
        break;
      } catch (e: any) {
        // Colisión de folio — el contador estaba desfasado (migración); reintentar
        if (e?.code === 11000 && e?.keyValue?.folio) {
          if (++attempts >= 5) {
            await this.liberarSlot(
              municipioId,
              dto.area,
              fechaCitaDate,
              dto.horario,
            );
            throw e;
          }
          continue;
        }
        // Cualquier otro error: liberar slot y propagar
        await this.liberarSlot(
          municipioId,
          dto.area,
          fechaCitaDate,
          dto.horario,
        );
        throw e;
      }
    }

    // 8. Enviar correo de confirmación (fire-and-forget)
    if (dto.correo) {
      this.enviarCorreoConfirmacion(
        dto.correo,
        dto.nombreCompleto,
        municipioNombre,
        cita,
        config.instrucciones ?? '',
        municipioSlug,
      ).catch((e) =>
        this.logger.error('Error enviando correo de confirmación', e),
      );
    }

    // 9. Emitir evento WS al panel interno (fire-and-forget, no bloquea la respuesta)
    this.sagimGateway.emitNuevaCita(municipioId, {
      folio: cita.folio,
      area: cita.area,
      tramite: cita.tramite,
      fechaCita: cita.fechaCita,
      horario: cita.horario,
      ciudadano: dto.nombreCompleto,
      origen: 'publico',
    });

    return {
      folio: cita.folio,
      tokenConsulta: cita.tokenConsulta,
      fechaCita: dto.fechaCita,
      horario: cita.horario,
      area: cita.area,
      tramite: cita.tramite,
      ciudadano: {
        nombreCompleto: cita.ciudadano.nombreCompleto,
        curp: cita.ciudadano.curp,
      },
      instrucciones: config.instrucciones ?? '',
      mensaje: 'Tu cita ha sido agendada. Recibirás confirmación por correo.',
    };
  }
    municipioId: string,
    folio: string,
    tokenOrCurp: string,
    municipioNombre: string,
    municipioSlug: string,
  ) {
    const folioUpper = folio.toUpperCase();
    const valorUpper = tokenOrCurp.toUpperCase();

    // Acepta token (UUID) o CURP (18 chars alfanumérico)
    const esCurp = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{2}$/.test(valorUpper);

    const query: any = {
      municipioId: new Types.ObjectId(municipioId),
      folio: folioUpper,
    };
    if (esCurp) {
      query['ciudadano.curp'] = valorUpper;
    } else {
      query.tokenConsulta = tokenOrCurp;
    }

    const cita = await this.citaModel.findOne(query).lean();

    if (!cita) {
      throw new NotFoundException('Folio, CURP o token inválido');
    }

    const config = await this.citaConfigModel
      .findOne({
        municipioId: new Types.ObjectId(municipioId),
        area: cita.area,
      })
      .lean();

    // Solo puede cancelar si faltan más de 2 horas
    const horasRestantes = dayjs(cita.fechaCita).diff(
      fecha.ahoraEnMexico(),
      'hour',
      true,
    );
    const puedeCancelar =
      horasRestantes > 2 &&
      (cita.estado === 'pendiente' || cita.estado === 'confirmada');

    return {
      folio: cita.folio,
      area: cita.area,
      tramite: cita.tramite,
      fechaCita: fecha.utcAMexico(cita.fechaCita).format('YYYY-MM-DD'),
      horario: cita.horario,
      estado: cita.estado,
      instrucciones: config?.instrucciones ?? '',
      puedeCancelar,
    };
  }

  /** PATCH /public/:slug/citas/cancelar */
  async cancelarCitaCiudadano(
    municipioId: string,
    folio: string,
    tokenOrCurp: string,
    motivo?: string,
  ) {
    const folioUpper = folio.toUpperCase();
    const valorUpper = tokenOrCurp.toUpperCase();

    const esCurp = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{2}$/.test(valorUpper);

    const query: any = {
      municipioId: new Types.ObjectId(municipioId),
      folio: folioUpper,
    };
    if (esCurp) {
      query['ciudadano.curp'] = valorUpper;
    } else {
      query.tokenConsulta = tokenOrCurp;
    }

    const cita = await this.citaModel.findOne(query);

    if (!cita) throw new NotFoundException('Folio, CURP o token inválido');

    if (cita.estado === 'cancelada' || cita.estado === 'atendida') {
      throw new ConflictException(
        `La cita ya fue ${cita.estado === 'cancelada' ? 'cancelada' : 'atendida'}`,
      );
    }

    // horasRestantes positivo = faltan X horas; negativo = ya pasó
    const horasRestantes = dayjs(cita.fechaCita).diff(
      fecha.ahoraEnMexico(),
      'hour',
      true,
    );
    if (horasRestantes < 2) {
      throw new ConflictException(
        'No se puede cancelar con menos de 2 horas de anticipación',
      );
    }

    cita.estado = 'cancelada';
    cita.cancelacion = {
      motivo: motivo ?? 'Cancelado por el ciudadano',
      fecha: fecha.ahoraEnMexico().toDate(),
      canceladoPor: 'ciudadano',
    };
    await cita.save();

    this.sagimGateway.emitCitaCancelada(municipioId, {
      folio: cita.folio,
      area: cita.area,
      fechaCita: cita.fechaCita,
      horario: cita.horario,
      ciudadano: cita.ciudadano.nombreCompleto,
      canceladoPor: 'ciudadano',
      motivo: motivo ?? 'Cancelado por el ciudadano',
    });

    return { mensaje: 'Tu cita ha sido cancelada correctamente.' };
  }

  // ═══════════════════════════════════════════════════════════
  // INTERNOS — PANEL DE FUNCIONARIOS
  // ═══════════════════════════════════════════════════════════

  /** GET /citas */
  async findCitas(
    municipioId: string,
    filters: {
      area?: string;
      fecha?: string;
      fechaInicio?: string;
      fechaFin?: string;
      estado?: string;
      curp?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const query: any = { municipioId: new Types.ObjectId(municipioId) };

    if (filters.area) query.area = filters.area;
    if (filters.estado) query.estado = filters.estado;
    if (filters.curp) query['ciudadano.curp'] = filters.curp.toUpperCase();

    if (filters.fecha) {
      query.fechaCita = {
        $gte: fecha.parsearFecha(filters.fecha),
        $lte: fecha.parsearFechaFin(filters.fecha),
      };
    } else if (filters.fechaInicio || filters.fechaFin) {
      query.fechaCita = {};
      if (filters.fechaInicio) {
        query.fechaCita.$gte = fecha.parsearFecha(filters.fechaInicio);
      }
      if (filters.fechaFin) {
        query.fechaCita.$lte = fecha.parsearFechaFin(filters.fechaFin);
      }
    }

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, filters.limit ?? 20);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.citaModel
        .find(query)
        .sort({ fechaCita: 1, horario: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.citaModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** GET /citas/hoy */
  async citasHoy(municipioId: string, area?: string) {
    const hoy = fecha.inicioDia();
    const finHoy = fecha.finDia();
    const fechaStr = fecha.ahoraEnMexico().format('YYYY-MM-DD');

    const query: any = {
      municipioId: new Types.ObjectId(municipioId),
      fechaCita: { $gte: hoy, $lte: finHoy },
    };
    if (area) query.area = area;

    const citas = await this.citaModel.find(query).sort({ horario: 1 }).lean();

    const totalCitas = citas.length;
    const atendidas = citas.filter((c) => c.estado === 'atendida').length;
    const pendientes = citas.filter(
      (c) => c.estado === 'pendiente' || c.estado === 'confirmada',
    ).length;
    const noSePresentaron = citas.filter(
      (c) => c.estado === 'no_se_presento',
    ).length;

    return {
      fecha: fechaStr,
      area: area ?? 'Todas las áreas',
      totalCitas,
      atendidas,
      pendientes,
      noSePresentaron,
      citas: citas.map((c) => ({
        folio: c.folio,
        horario: c.horario,
        ciudadano: {
          nombreCompleto: c.ciudadano.nombreCompleto,
          curp: c.ciudadano.curp,
          telefono: c.ciudadano.telefono,
        },
        tramite: c.tramite,
        estado: c.estado,
        origen: c.origen,
        notasCiudadano: c.notasCiudadano,
      })),
    };
  }

  /** GET /citas/:id */
  async findCitaById(id: string, municipioId: string): Promise<CitaDocument> {
    const cita = await this.citaModel
      .findOne({
        _id: new Types.ObjectId(id),
        municipioId: new Types.ObjectId(municipioId),
      })
      .exec();

    if (!cita) throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    return cita;
  }

  /** POST /citas — Crear desde panel interno */
  async crearCitaInterna(
    municipioId: string,
    dto: CrearCitaPublicaDto,
    userId: string,
    municipioNombre: string,
  ) {
    const result = await this.crearCitaPublica(
      municipioId,
      dto,
      municipioNombre,
    );

    // Sobreescribir origen a 'recepcion' y registrar quién agendó
    await this.citaModel.updateOne(
      { folio: result.folio },
      { origen: 'recepcion', agendadoPor: new Types.ObjectId(userId) },
    );

    return result;
  }

  /** PATCH /citas/:id/estado */
  async cambiarEstado(
    id: string,
    dto: CambiarEstadoCitaDto,
    municipioId: string,
    userId: string,
  ): Promise<CitaDocument> {
    const cita = await this.findCitaById(id, municipioId);

    if (cita.estado === 'cancelada' || cita.estado === 'atendida') {
      throw new ConflictException(
        `No se puede cambiar el estado de una cita ${cita.estado}`,
      );
    }

    if (dto.estado === 'cancelada' && !dto.motivo) {
      throw new BadRequestException(
        'El motivo es requerido al cancelar una cita',
      );
    }

    cita.estado = dto.estado;
    if (dto.notasFuncionario) cita.notasFuncionario = dto.notasFuncionario;

    if (dto.estado === 'atendida') {
      cita.fechaAtencion = fecha.ahoraEnMexico().toDate();
      cita.atendidaPor = new Types.ObjectId(userId);
    }

    if (dto.estado === 'cancelada') {
      cita.cancelacion = {
        motivo: dto.motivo!,
        fecha: fecha.ahoraEnMexico().toDate(),
        canceladoPor: 'funcionario',
        usuarioId: new Types.ObjectId(userId),
      };
    }

    const savedCita = await cita.save();

    // Liberar el slot al cancelar la cita
    if (dto.estado === 'cancelada') {
      await this.liberarSlot(
        municipioId,
        cita.area,
        cita.fechaCita,
        cita.horario,
      );
    }

    // Emitir evento WS al panel interno
    if (dto.estado === 'cancelada') {
      this.sagimGateway.emitCitaCancelada(municipioId, {
        folio: savedCita.folio,
        area: savedCita.area,
        fechaCita: savedCita.fechaCita,
        horario: savedCita.horario,
        ciudadano: savedCita.ciudadano.nombreCompleto,
        canceladoPor: 'funcionario',
        motivo: dto.motivo,
      });
    } else {
      this.sagimGateway.emitCitaActualizada(municipioId, {
        folio: savedCita.folio,
        area: savedCita.area,
        fechaCita: savedCita.fechaCita,
        horario: savedCita.horario,
        ciudadano: savedCita.ciudadano.nombreCompleto,
        estado: savedCita.estado,
      });
    }

    return savedCita;
  }

  /** PATCH /citas/:id/reagendar */
  async reagendar(
    id: string,
    dto: ReagendarCitaDto,
    municipioId: string,
    municipioNombre: string,
  ): Promise<CitaDocument> {
    const cita = await this.findCitaById(id, municipioId);

    if (cita.estado !== 'pendiente' && cita.estado !== 'confirmada') {
      throw new ConflictException(
        'Solo se pueden reagendar citas en estado pendiente o confirmada',
      );
    }

    const config = await this.citaConfigModel
      .findOne({
        municipioId: new Types.ObjectId(municipioId),
        area: cita.area,
        activo: true,
      })
      .exec();

    if (!config)
      throw new NotFoundException('Configuración de área no encontrada');

    const nuevaFechaMX = dayjs
      .tz(dto.fechaCita, 'YYYY-MM-DD', TIMEZONE_MEXICO)
      .startOf('day');
    const nuevaFechaDate = nuevaFechaMX.toDate();

    if (
      await this.esDiaBloqueado(municipioId, cita.area, nuevaFechaDate, config)
    ) {
      throw new ConflictException('La nueva fecha está bloqueada');
    }

    // Capacidad del nuevo slot
    const nombreDia = DIA_SEMANA[nuevaFechaMX.day()];
    const horarioDia = config.horarios?.find(
      (h) => h.dia === nombreDia && h.activo,
    );
    if (!horarioDia) throw new ConflictException('El área no atiende ese día');

    let capacidadSlot = 1;
    for (const bloque of horarioDia.bloques ?? []) {
      const slots = this.generarSlots(
        bloque.inicio,
        bloque.fin,
        config.duracionSlotMinutos ?? 30,
      );
      if (slots.includes(dto.horario)) {
        capacidadSlot = bloque.capacidadPorSlot ?? 1;
        break;
      }
    }

    // Guardar datos del slot original antes de modificar
    const oldFechaDate = cita.fechaCita;
    const oldHorario = cita.horario;

    // Reservar el nuevo slot atómicamente
    await this.reservarSlot(
      municipioId,
      cita.area,
      nuevaFechaDate,
      dto.horario,
      capacidadSlot,
    );

    const [hh, mm] = dto.horario.split(':').map(Number);
    cita.fechaCita = nuevaFechaMX
      .hour(hh)
      .minute(mm)
      .second(0)
      .millisecond(0)
      .utc()
      .toDate();
    cita.horario = dto.horario;

    let savedCita: CitaDocument;
    try {
      savedCita = await cita.save();
    } catch (e) {
      // Liberar el nuevo slot si no se pudo guardar
      await this.liberarSlot(
        municipioId,
        cita.area,
        nuevaFechaDate,
        dto.horario,
      );
      throw e;
    }

    // Reagendado con éxito — liberar el slot original
    await this.liberarSlot(municipioId, cita.area, oldFechaDate, oldHorario);

    // Emitir evento WS al panel interno
    this.sagimGateway.emitCitaActualizada(municipioId, {
      folio: savedCita.folio,
      area: savedCita.area,
      fechaCita: savedCita.fechaCita,
      horario: savedCita.horario,
      ciudadano: savedCita.ciudadano.nombreCompleto,
      estado: 'reagendada',
    });

    // Notificar al ciudadano
    if (cita.ciudadano.correo) {
      this.enviarCorreoReagendada(
        cita.ciudadano.correo,
        cita.ciudadano.nombreCompleto,
        municipioNombre,
        savedCita,
      ).catch((e) => this.logger.error('Error enviando correo reagendada', e));
    }

    return savedCita;
  }

  /** GET /citas/metricas */
  async getMetricas(
    municipioId: string,
    mes: number,
    anio: number,
    area?: string,
  ) {
    const inicio = fecha.inicioMes(mes, anio);
    const fin = fecha.finMes(mes, anio);

    const match: any = {
      municipioId: new Types.ObjectId(municipioId),
      fechaCita: { $gte: inicio, $lte: fin },
    };
    if (area) match.area = area;

    const [resumen, porArea, porDia, tramites, origenes] = await Promise.all([
      this.citaModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalAgendadas: { $sum: 1 },
            totalAtendidas: {
              $sum: { $cond: [{ $eq: ['$estado', 'atendida'] }, 1, 0] },
            },
            totalNoSePresentaron: {
              $sum: { $cond: [{ $eq: ['$estado', 'no_se_presento'] }, 1, 0] },
            },
            totalCanceladas: {
              $sum: { $cond: [{ $eq: ['$estado', 'cancelada'] }, 1, 0] },
            },
          },
        },
      ]),
      this.citaModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$area',
            agendadas: { $sum: 1 },
            atendidas: {
              $sum: { $cond: [{ $eq: ['$estado', 'atendida'] }, 1, 0] },
            },
            noSePresentaron: {
              $sum: { $cond: [{ $eq: ['$estado', 'no_se_presento'] }, 1, 0] },
            },
            canceladas: {
              $sum: { $cond: [{ $eq: ['$estado', 'cancelada'] }, 1, 0] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            area: '$_id',
            agendadas: 1,
            atendidas: 1,
            noSePresentaron: 1,
            canceladas: 1,
          },
        },
        { $sort: { agendadas: -1 } },
      ]),
      this.citaModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$fechaCita' } },
            total: { $sum: 1 },
            atendidas: {
              $sum: { $cond: [{ $eq: ['$estado', 'atendida'] }, 1, 0] },
            },
          },
        },
        { $project: { _id: 0, fecha: '$_id', total: 1, atendidas: 1 } },
        { $sort: { fecha: 1 } },
      ]),
      this.citaModel.aggregate([
        { $match: match },
        { $group: { _id: '$tramite', total: { $sum: 1 } } },
        { $project: { _id: 0, tramite: '$_id', total: 1 } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),
      this.citaModel.aggregate([
        { $match: match },
        { $group: { _id: '$origen', total: { $sum: 1 } } },
      ]),
    ]);

    const r = resumen[0] ?? {
      totalAgendadas: 0,
      totalAtendidas: 0,
      totalNoSePresentaron: 0,
      totalCanceladas: 0,
    };
    const tasaAsistencia =
      r.totalAgendadas > 0
        ? Math.round((r.totalAtendidas / r.totalAgendadas) * 1000) / 10
        : 0;

    const portalPublico =
      origenes.find((o: any) => o._id === 'portal_publico')?.total ?? 0;
    const recepcion =
      origenes.find((o: any) => o._id === 'recepcion')?.total ?? 0;

    return {
      ...r,
      tasaAsistencia,
      porArea,
      porDia,
      tramitesMasSolicitados: tramites,
      origenCitas: { portalPublico, recepcion },
    };
  }

  // ═══════════════════════════════════════════════════════════
  // CONFIGURACIÓN
  // ═══════════════════════════════════════════════════════════

  async getConfiguraciones(municipioId: string) {
    return this.citaConfigModel
      .find({ municipioId: new Types.ObjectId(municipioId) })
      .sort({ area: 1 })
      .lean();
  }

  /**
   * Devuelve los módulos activos del municipio que AÚN no tienen
   * configuración de citas — para el modal "Agregar área" en el panel.
   */
  async getAreasDisponibles(municipioId: string) {
    // Mapa de módulo → nombre de área amigable
    const AREAS_POR_MODULO: Array<{ modulo: string; area: string }> = [
      { modulo: 'REGISTRO_CIVIL', area: 'Registro Civil' },
      { modulo: 'DIF', area: 'DIF' },
      { modulo: 'TESORERIA', area: 'Tesorería' },
      { modulo: 'PRESIDENCIA', area: 'Presidencia' },
      {
        modulo: 'SECRETARIA_AYUNTAMIENTO',
        area: 'Secretaría del Ayuntamiento',
      },
      { modulo: 'DESARROLLO_URBANO', area: 'Desarrollo Urbano' },
      { modulo: 'DESARROLLO_SOCIAL', area: 'Desarrollo Social' },
      { modulo: 'DESARROLLO_ECONOMICO', area: 'Desarrollo Económico' },
      { modulo: 'SERVICIOS_PUBLICOS', area: 'Servicios Públicos' },
      { modulo: 'SEGURIDAD_PUBLICA', area: 'Seguridad Pública' },
      { modulo: 'ORGANISMO_AGUA', area: 'Organismo del Agua' },
      { modulo: 'CONTRALORIA', area: 'Contraloría' },
      { modulo: 'UIPPE', area: 'UIPPE' },
      { modulo: 'COMUNICACION_SOCIAL', area: 'Comunicación Social' },
    ];

    // 1. Módulos habilitados en el municipio
    const municipio = await this.municipioModel
      .findById(new Types.ObjectId(municipioId))
      .select('config')
      .lean();

    if (!municipio) throw new NotFoundException('Municipio no encontrado');

    const modulosConfig = (municipio as any).config?.modulos ?? {};
    const modulosActivos = Object.entries(modulosConfig)
      .filter(([, activo]) => activo === true)
      .map(([modulo]) => modulo);

    // 2. Módulos que ya tienen configuración de citas
    const configuradas = await this.citaConfigModel
      .find({ municipioId: new Types.ObjectId(municipioId) })
      .select('modulo')
      .lean();
    const modulosConfigurados = new Set(configuradas.map((c) => c.modulo));

    // 3. Filtrar disponibles
    return AREAS_POR_MODULO.filter(
      (a) =>
        modulosActivos.includes(a.modulo) && !modulosConfigurados.has(a.modulo),
    );
  }

  async getConfiguracionByArea(municipioId: string, area: string) {
    const config = await this.citaConfigModel
      .findOne({ municipioId: new Types.ObjectId(municipioId), area })
      .lean();

    if (!config)
      throw new NotFoundException(`No hay configuración para "${area}"`);
    return config;
  }

  async createConfiguracion(
    municipioId: string,
    dto: CreateCitaConfiguracionDto,
    userId: string,
  ) {
    const existente = await this.citaConfigModel.findOne({
      municipioId: new Types.ObjectId(municipioId),
      area: dto.area,
    });
    if (existente) {
      throw new ConflictException(
        `Ya existe una configuración para "${dto.area}". Usa PATCH para actualizar.`,
      );
    }

    return this.citaConfigModel.create({
      ...dto,
      municipioId: new Types.ObjectId(municipioId),
      activo: true,
      configuradoPor: new Types.ObjectId(userId),
    });
  }

  async updateConfiguracion(
    municipioId: string,
    area: string,
    dto: UpdateCitaConfiguracionDto,
  ) {
    const config = await this.citaConfigModel.findOneAndUpdate(
      { municipioId: new Types.ObjectId(municipioId), area },
      { $set: dto },
      { new: true },
    );
    if (!config)
      throw new NotFoundException(`No hay configuración para "${area}"`);
    return config;
  }

  async toggleConfiguracion(
    municipioId: string,
    area: string,
    activo?: boolean,
  ) {
    const config = await this.citaConfigModel.findOne({
      municipioId: new Types.ObjectId(municipioId),
      area,
    });
    if (!config)
      throw new NotFoundException(`No hay configuración para "${area}"`);

    // Si no se pasa activo explícitamente, invierte el estado actual
    const nuevoEstado = activo !== undefined ? activo : !config.activo;

    config.activo = nuevoEstado;
    await config.save();
    return config;
  }

  async getBloqueos(municipioId: string, area?: string) {
    const query: any = { municipioId: new Types.ObjectId(municipioId) };
    if (area) query.area = area;
    return this.bloqueoModel.find(query).sort({ fechaInicio: 1 }).lean();
  }

  async addBloqueo(
    municipioId: string,
    area: string,
    dto: CreateBloqueoDto,
    userId: string,
  ) {
    await this.getConfiguracionByArea(municipioId, area); // valida que exista

    return this.bloqueoModel.create({
      municipioId: new Types.ObjectId(municipioId),
      area,
      fechaInicio: fecha.parsearFecha(dto.fechaInicio),
      fechaFin: fecha.parsearFechaFin(dto.fechaFin),
      motivo: dto.motivo,
      creadoPor: new Types.ObjectId(userId),
    });
  }

  async deleteBloqueo(municipioId: string, area: string, bloqueoId: string) {
    const result = await this.bloqueoModel.deleteOne({
      _id: new Types.ObjectId(bloqueoId),
      municipioId: new Types.ObjectId(municipioId),
      area,
    });
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Bloqueo ${bloqueoId} no encontrado`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CRON JOBS
  // ═══════════════════════════════════════════════════════════

  /** Enviar recordatorios 24 horas antes — 10:00 AM diario (hora México) */
  @Cron('0 10 * * *', { timeZone: TIMEZONE_MEXICO })
  async enviarRecordatorios() {
    this.logger.log('⏰ [CRON] Enviando recordatorios de citas...');

    const manana = fecha.ahoraEnMexico().add(1, 'day');
    const inicioCron = manana.startOf('day').utc().toDate();
    const finCron = manana.endOf('day').utc().toDate();

    const citas = await this.citaModel.find({
      fechaCita: { $gte: inicioCron, $lte: finCron },
      estado: { $in: ['pendiente', 'confirmada'] },
      recordatorioEnviado: false,
      'ciudadano.correo': { $exists: true, $ne: '' },
    });

    let enviados = 0;
    for (const cita of citas) {
      try {
        // Recuperar instrucciones del área
        const config = await this.citaConfigModel
          .findOne({ municipioId: cita.municipioId, area: cita.area })
          .lean();

        const municipio = await this.municipioModel
          .findById(cita.municipioId)
          .lean();

        await this.enviarCorreoRecordatorio(
          cita.ciudadano.correo,
          cita.ciudadano.nombreCompleto,
          municipio?.nombre ?? 'Municipio',
          cita,
          config?.instrucciones ?? '',
          municipio?.claveInegi ?? '',
        );

        cita.recordatorioEnviado = true;
        await cita.save();
        enviados++;
      } catch (e) {
        this.logger.error(
          `Error enviando recordatorio para cita ${cita.folio}`,
          e,
        );
      }
    }

    this.logger.log(
      `✅ [CRON] Recordatorios enviados: ${enviados}/${citas.length}`,
    );
  }

  /** Marcar no_se_presento automáticamente — 8:00 PM diario (hora México) */
  @Cron('0 20 * * *', { timeZone: TIMEZONE_MEXICO })
  async marcarNoSePresento() {
    this.logger.log('⏰ [CRON] Marcando citas no atendidas...');

    // Buscar citas de hoy (MX tz) que sigan pendientes/confirmadas
    const inicioDiaHoy = fecha.inicioDia();
    const ahoraUtc = fecha.ahoraEnMexico().subtract(1, 'hour').utc().toDate();

    const citas = await this.citaModel.find({
      fechaCita: { $gte: inicioDiaHoy, $lte: ahoraUtc },
      estado: { $in: ['pendiente', 'confirmada'] },
    });

    let actualizadas = 0;
    for (const cita of citas) {
      // fechaCita ya tiene la hora correcta en UTC; verificar que pasó >1h
      const diffHoras = fecha
        .ahoraEnMexico()
        .diff(dayjs(cita.fechaCita), 'hour', true);

      if (diffHoras > 1) {
        cita.estado = 'no_se_presento';
        await cita.save();
        actualizadas++;
      }
    }

    this.logger.log(
      `✅ [CRON] Citas marcadas como no_se_presento: ${actualizadas}`,
    );
  }

  // ═══════════════════════════════════════════════════════════
  // EMAIL HELPERS (fire-and-forget)
  // ═══════════════════════════════════════════════════════════

  private async enviarCorreoConfirmacion(
    email: string,
    nombre: string,
    municipioNombre: string,
    cita: any,
    instrucciones: string,
    municipioSlug: string,
  ) {
    const fechaStr = fecha
      .utcAMexico(cita.fechaCita)
      .format('dddd, DD [de] MMMM [de] YYYY');
    const horaStr = fecha.utcAMexico(cita.fechaCita).format('HH:mm');

    const linkConsultar = `${this.frontendUrl}/public/${municipioSlug}/citas/consultar?folio=${cita.folio}&token=${cita.tokenConsulta}`;
    const linkCancelar = `${this.frontendUrl}/public/${municipioSlug}/citas/consultar?folio=${cita.folio}&token=${cita.tokenConsulta}&action=cancelar`;

    await this.resend.emails.send({
      from: `${municipioNombre} <${this.emailFrom}>`,
      to: email,
      subject: `✅ Cita confirmada — ${cita.folio}`,
      html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a237e 0%,#283593 100%);padding:32px 40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.7);letter-spacing:1px;text-transform:uppercase;">Municipio de ${municipioNombre}</p>
            <h1 style="margin:0;font-size:26px;color:#ffffff;font-weight:700;">Cita confirmada</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 24px;font-size:16px;color:#333;">Hola <strong>${nombre}</strong>, tu cita ha sido agendada correctamente.</p>

            <!-- Info card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8eaf6;border-radius:8px;overflow:hidden;margin-bottom:28px;">
              <tr style="background:#e8eaf6;">
                <td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;color:#3949ab;letter-spacing:0.8px;text-transform:uppercase;">Detalles de tu cita</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#666;font-weight:600;width:36%;border-bottom:1px solid #f0f0f0;">Folio</td>
                <td style="padding:12px 16px;font-size:14px;color:#1a237e;font-weight:700;border-bottom:1px solid #f0f0f0;font-family:monospace;">${cita.folio}</td>
              </tr>
              <tr style="background:#fafafa;">
                <td style="padding:12px 16px;font-size:13px;color:#666;font-weight:600;border-bottom:1px solid #f0f0f0;">Área</td>
                <td style="padding:12px 16px;font-size:14px;color:#222;border-bottom:1px solid #f0f0f0;">${cita.area}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#666;font-weight:600;border-bottom:1px solid #f0f0f0;">Trámite</td>
                <td style="padding:12px 16px;font-size:14px;color:#222;border-bottom:1px solid #f0f0f0;">${cita.tramite}</td>
              </tr>
              <tr style="background:#fafafa;">
                <td style="padding:12px 16px;font-size:13px;color:#666;font-weight:600;border-bottom:1px solid #f0f0f0;">Fecha</td>
                <td style="padding:12px 16px;font-size:14px;color:#222;border-bottom:1px solid #f0f0f0;">${fechaStr}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#666;font-weight:600;">Hora</td>
                <td style="padding:12px 16px;font-size:14px;color:#222;font-weight:600;">${horaStr}</td>
              </tr>
            </table>

            ${
              instrucciones
                ? `
            <!-- Instrucciones -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border-left:4px solid #ffc107;border-radius:0 6px 6px 0;margin-bottom:28px;">
              <tr>
                <td style="padding:14px 16px;font-size:14px;color:#5d4037;">
                  <strong>Instrucciones:</strong> ${instrucciones}
                </td>
              </tr>
            </table>`
                : ''
            }

            <!-- Botones -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="padding-right:8px;" width="50%">
                  <a href="${linkConsultar}" style="display:block;text-align:center;padding:13px 20px;background:#1a237e;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                    Ver mi cita
                  </a>
                </td>
                <td style="padding-left:8px;" width="50%">
                  <a href="${linkCancelar}" style="display:block;text-align:center;padding:13px 20px;background:#ffffff;color:#c62828;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;border:2px solid #c62828;">
                    Cancelar cita
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:12px;color:#9e9e9e;text-align:center;">
              ¿No tienes acceso al correo? Guarda tu folio <strong style="color:#555;">${cita.folio}</strong> y consulta tu cita con tu CURP desde el portal ciudadano.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f5f5f5;padding:20px 40px;text-align:center;border-top:1px solid #eeeeee;">
            <p style="margin:0;font-size:12px;color:#bdbdbd;">Este correo fue generado automáticamente por el sistema SAGIM · ${municipioNombre}</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
      `,
    });

    this.logger.log(`Email de confirmación enviado a ${email} — ${cita.folio}`);
  }

  private async enviarCorreoRecordatorio(
    email: string,
    nombre: string,
    municipioNombre: string,
    cita: any,
    instrucciones: string,
    municipioSlug: string,
  ) {
    const fechaStr = fecha
      .utcAMexico(cita.fechaCita)
      .format('dddd, DD [de] MMMM [de] YYYY');
    const horaStr = fecha.utcAMexico(cita.fechaCita).format('HH:mm');

    const linkCancelar = `${this.frontendUrl}/public/${municipioSlug}/citas/consultar?folio=${cita.folio}&token=${cita.tokenConsulta}`;

    await this.resend.emails.send({
      from: `${municipioNombre} <${this.emailFrom}>`,
      to: email,
      subject: `⏰ Recordatorio: tu cita es mañana — ${cita.folio}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#1a237e;">Recordatorio de cita</h2>
          <p>Hola <strong>${nombre}</strong>, te recordamos que mañana tienes una cita.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">Área</td><td style="padding:8px;">${cita.area}</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">Trámite</td><td style="padding:8px;">${cita.tramite}</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">Fecha</td><td style="padding:8px;">${fechaStr}</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">Hora</td><td style="padding:8px;">${horaStr}</td></tr>
          </table>
          ${instrucciones ? `<p><strong>Instrucciones:</strong> ${instrucciones}</p>` : ''}
          <p><a href="${linkCancelar}" style="color:#d32f2f;">¿No puedes asistir? Cancela tu cita aquí</a></p>
        </div>
      `,
    });
  }

  private async enviarCorreoReagendada(
    email: string,
    nombre: string,
    municipioNombre: string,
    cita: any,
  ) {
    const fechaStr = fecha
      .utcAMexico(cita.fechaCita)
      .format('dddd, DD [de] MMMM [de] YYYY');
    const horaStr = fecha.utcAMexico(cita.fechaCita).format('HH:mm');

    await this.resend.emails.send({
      from: `${municipioNombre} <${this.emailFrom}>`,
      to: email,
      subject: `🔄 Tu cita fue reagendada — ${cita.folio}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#1a237e;">Cita reagendada</h2>
          <p>Hola <strong>${nombre}</strong>, tu cita ha sido reprogramada.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">Nueva fecha</td><td style="padding:8px;">${fechaStr}</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">Nueva hora</td><td style="padding:8px;">${horaStr}</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">Área</td><td style="padding:8px;">${cita.area}</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">Trámite</td><td style="padding:8px;">${cita.tramite}</td></tr>
          </table>
        </div>
      `,
    });
  }
}
