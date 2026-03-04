import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { fecha } from '@/common/helpers/fecha.helper';

import {
  Beneficiario,
  BeneficiarioDocument,
} from './schemas/beneficiario.schema';
import { Programa, ProgramaDocument } from './schemas/programa.schema';
import { Apoyo, ApoyoDocument } from './schemas/apoyo.schema';
import {
  Inventario,
  InventarioDocument,
  TipoInventario,
} from './schemas/inventario.schema';
import {
  MovimientoInventario,
  MovimientoInventarioDocument,
  TipoMovimiento,
} from './schemas/movimiento-inventario.schema';
import { Counter, CounterDocument } from './schemas/counter.schema';
import {
  CreateBeneficiarioDto,
  UpdateBeneficiarioDto,
  CreateProgramaDto,
  CreateApoyoDto,
  CreateEntradaInventarioDto,
} from './dto';

@Injectable()
export class DifService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Beneficiario.name)
    private beneficiarioModel: Model<BeneficiarioDocument>,
    @InjectModel(Programa.name)
    private programaModel: Model<ProgramaDocument>,
    @InjectModel(Apoyo.name)
    private apoyoModel: Model<ApoyoDocument>,
    @InjectModel(Inventario.name)
    private inventarioModel: Model<InventarioDocument>,
    @InjectModel(MovimientoInventario.name)
    private movimientoInventarioModel: Model<MovimientoInventarioDocument>,
    @InjectModel(Counter.name)
    private counterModel: Model<CounterDocument>,
  ) {}

  // ==================== UTILIDADES ====================
  /**
   * Generar folio secuencial para movimientos de inventario
   * Usa contador atómico para evitar colisiones bajo concurrencia
   * Compatible con transacciones MongoDB
   */
  private async generateFolioMovimiento(
    municipioId: string,
    session?: any,
  ): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const munShort = municipioId.toString().slice(-4).toUpperCase();
    const counterId = `mov-${munShort}-${year}${month}`;

    // Incremento atómico del contador
    const counter = await this.counterModel.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      {
        upsert: true,
        new: true,
        session: session || undefined,
      },
    );

    // Generar folio con secuencia de 4 dígitos
    const secuencial = counter.seq.toString().padStart(4, '0');
    return `MOV-${year}${month}-${secuencial}`;
  }

  private async generateFolioApoyo(
    municipioId: string,
    session?: any,
  ): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const munShort = municipioId.toString().slice(-4).toUpperCase();
    const counterId = `apo-${munShort}-${year}${month}`;

    const counter = await this.counterModel.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      {
        upsert: true,
        new: true,
        session: session || undefined,
      },
    );

    const secuencial = counter.seq.toString().padStart(4, '0');
    return `APO-${year}${month}-${secuencial}`;
  }

  /**
   * Generar folio secuencial para beneficiarios por municipio
   * Counter scoped por municipio, pero el folio visible NO expone el municipioId
   */
  private async generateFolioBeneficiario(
    municipioId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const munShort = municipioId.toString().slice(-4).toUpperCase();
    const counterId = `ben-${munShort}-${year}${month}`;

    const counter = await this.counterModel.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );

    const secuencial = counter.seq.toString().padStart(4, '0');
    return `BEN-${year}${month}-${secuencial}`;
  }

  // ==================== BENEFICIARIOS ====================
  async createBeneficiario(
    createBeneficiarioDto: CreateBeneficiarioDto,
    municipioId: string,
  ): Promise<Beneficiario> {
    // Validar que no exista el beneficiario con el mismo CURP en el municipio
    const existente = await this.beneficiarioModel.findOne({
      curp: createBeneficiarioDto.curp,
      municipioId: new Types.ObjectId(municipioId),
    });

    if (existente) {
      throw new ConflictException(
        'El beneficiario ya está registrado en este municipio',
      );
    }

    const beneficiario = new this.beneficiarioModel({
      ...createBeneficiarioDto,
      municipioId: new Types.ObjectId(municipioId),
      fechaRegistro: new Date(),
    });

    // Generar folio consecutivo atómico por municipio
    beneficiario.folio = await this.generateFolioBeneficiario(municipioId);

    return beneficiario.save();
  }

  async findBeneficiarios(
    scope: any,
    filters: {
      search?: string; // nombre, apellidos, CURP o folio
      curp?: string; // búsqueda exacta/parcial por CURP (legacy)
      sexo?: string; // 'M' | 'F'
      activo?: boolean; // true | false | undefined = solo activos
      fechaInicio?: string; // ISO fecha registro desde
      fechaFin?: string; // ISO fecha registro hasta
      edadMin?: number; // edad mínima (años cumplidos)
      edadMax?: number; // edad máxima (años cumplidos)
      programaId?: string; // ObjectId de programa DIF
    } = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Beneficiario[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: any = { ...scope };

    // Estatus: por defecto solo activos
    if (filters.activo === undefined || filters.activo === true) {
      query.activo = true;
    } else if (filters.activo === false) {
      query.activo = false;
    }

    // Búsqueda global: nombre completo, CURP o folio
    if (filters.search) {
      const regex = { $regex: filters.search, $options: 'i' };
      query.$or = [
        { nombre: regex },
        { apellidoPaterno: regex },
        { apellidoMaterno: regex },
        { curp: { $regex: filters.search.toUpperCase(), $options: 'i' } },
        { folio: { $regex: filters.search.toUpperCase(), $options: 'i' } },
      ];
    }

    // Legacy: búsqueda por CURP (si no viene search)
    if (filters.curp && !filters.search) {
      query.curp = { $regex: filters.curp.toUpperCase(), $options: 'i' };
    }

    // Sexo
    if (filters.sexo) {
      query.sexo = filters.sexo.toUpperCase();
    }

    // Rango de fecha de registro
    if (filters.fechaInicio || filters.fechaFin) {
      query.fechaRegistro = {};
      if (filters.fechaInicio)
        query.fechaRegistro.$gte = fecha.inicioDia(filters.fechaInicio);
      if (filters.fechaFin)
        query.fechaRegistro.$lte = fecha.finDia(filters.fechaFin);
    }

    // Rango de edad (calculado desde fechaNacimiento)
    if (filters.edadMin !== undefined || filters.edadMax !== undefined) {
      const hoy = new Date();
      query.fechaNacimiento = {};
      if (filters.edadMax !== undefined) {
        // edad >= edadMax  →  nació antes de (hoy - edadMax años)
        const desde = new Date(hoy);
        desde.setFullYear(hoy.getFullYear() - filters.edadMax - 1);
        query.fechaNacimiento.$gte = desde;
      }
      if (filters.edadMin !== undefined) {
        // edad <= edadMin  →  nació después de (hoy - edadMin años)
        const hasta = new Date(hoy);
        hasta.setFullYear(hoy.getFullYear() - filters.edadMin);
        query.fechaNacimiento.$lte = hasta;
      }
    }

    // Filtro por programa: buscar beneficiarioIds en apoyos
    if (filters.programaId) {
      const apoyos = await this.apoyoModel
        .find({ programaId: new Types.ObjectId(filters.programaId) })
        .select('beneficiarioId')
        .lean()
        .exec();
      const ids = [
        ...new Set(apoyos.map((a: any) => a.beneficiarioId.toString())),
      ];
      query._id = { $in: ids.map((id) => new Types.ObjectId(id)) };
    }

    const total = await this.beneficiarioModel.countDocuments(query).exec();
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const data = await this.beneficiarioModel
      .find(query)
      .populate('municipioId', 'nombre')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findBeneficiarioByCurp(
    curp: string,
    scope: any,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    const beneficiario = await this.beneficiarioModel
      .findOne({
        curp: curp.toUpperCase(),
        ...scope,
        activo: true,
      })
      .populate('municipioId', 'nombre')
      .lean()
      .exec();

    if (!beneficiario) {
      throw new NotFoundException(
        `Beneficiario con CURP ${curp} no encontrado`,
      );
    }

    // Contar total de apoyos
    const totalApoyos = await this.apoyoModel
      .countDocuments({
        beneficiarioId: beneficiario._id,
      })
      .exec();

    // Obtener apoyos paginados
    const skip = (page - 1) * limit;
    const apoyos = await this.apoyoModel
      .find({
        beneficiarioId: beneficiario._id,
      })
      .populate('programaId', 'nombre descripcion')
      .populate('entregadoPor', 'nombre email')
      .sort({ fecha: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    // Obtener programas únicos en los que está inscrito (todos, sin paginar)
    const todosLosApoyos = await this.apoyoModel
      .find({
        beneficiarioId: beneficiario._id,
      })
      .select('programaId')
      .lean()
      .exec();

    const programasIds = [
      ...new Set(todosLosApoyos.map((a) => a.programaId.toString())),
    ];
    const programas = await this.programaModel
      .find({
        _id: { $in: programasIds },
      })
      .lean()
      .exec();

    return {
      ...beneficiario,
      historialApoyos: {
        data: apoyos,
        total: totalApoyos,
        page,
        limit,
        totalPages: Math.ceil(totalApoyos / limit),
      },
      programasActivos: programas,
      totalApoyos,
      ultimoApoyo: apoyos[0] || null,
    };
  }

  async findBeneficiarioById(id: string, scope: any): Promise<Beneficiario> {
    const beneficiario = await this.beneficiarioModel
      .findOne({
        _id: new Types.ObjectId(id),
        ...scope,
      })
      .populate('municipioId', 'nombre')
      .exec();

    if (!beneficiario) {
      throw new NotFoundException(`Beneficiario con ID ${id} no encontrado`);
    }

    return beneficiario;
  }

  async updateBeneficiario(
    id: string,
    updateBeneficiarioDto: UpdateBeneficiarioDto,
    municipioId: string,
  ): Promise<Beneficiario> {
    // Validar que el beneficiario existe
    const beneficiario = await this.findBeneficiarioById(id, {
      municipioId: new Types.ObjectId(municipioId),
    });

    // Si se está actualizando el CURP, validar que no exista otro beneficiario con ese CURP
    if (
      updateBeneficiarioDto.curp &&
      updateBeneficiarioDto.curp !== beneficiario.curp
    ) {
      const existente = await this.beneficiarioModel.findOne({
        curp: updateBeneficiarioDto.curp,
        municipioId: new Types.ObjectId(municipioId),
        _id: { $ne: new Types.ObjectId(id) },
      });

      if (existente) {
        throw new ConflictException(
          'Ya existe otro beneficiario con ese CURP en este municipio',
        );
      }
    }

    // Actualizar beneficiario
    const beneficiarioActualizado = await this.beneficiarioModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          municipioId: new Types.ObjectId(municipioId),
        },
        { $set: updateBeneficiarioDto },
        { new: true },
      )
      .exec();

    return beneficiarioActualizado;
  }

  // ==================== PROGRAMAS ====================
  async createPrograma(
    createProgramaDto: CreateProgramaDto,
    municipioId?: string,
  ): Promise<Programa> {
    const programaData: any = {
      ...createProgramaDto,
    };

    // Solo añadir municipioId si está presente
    if (municipioId) {
      programaData.municipioId = new Types.ObjectId(municipioId);
    }

    const programa = new this.programaModel(programaData);

    return programa.save();
  }

  async findProgramas(scope: any): Promise<Programa[]> {
    const filter: any = { activo: true };

    // Programas globales: municipioId null o inexistente
    const globalFilter = {
      $or: [{ municipioId: { $exists: false } }, { municipioId: null }],
    };

    if (scope?.municipioId) {
      // Traer programas globales Y los del municipio
      filter.$or = [...globalFilter.$or, { municipioId: scope.municipioId }];
    } else {
      // SUPER_ADMIN sin municipio: solo globales
      filter.$or = globalFilter.$or;
    }

    return this.programaModel.find(filter).sort({ nombre: 1 }).exec();
  }

  async findProgramaById(id: string, scope: any): Promise<Programa> {
    const filter: any = { _id: new Types.ObjectId(id) };

    // Si viene municipioId en scope, permitir programas globales Y del municipio
    if (scope?.municipioId) {
      filter.$or = [
        { municipioId: { $exists: false } }, // No existe el campo
        { municipioId: null }, // Campo existe pero es null
        { municipioId: scope.municipioId }, // Programa del municipio
      ];
    } else {
      filter.$or = [{ municipioId: { $exists: false } }, { municipioId: null }];
    }

    const programa = await this.programaModel.findOne(filter).exec();

    if (!programa) {
      throw new NotFoundException(`Programa con ID ${id} no encontrado`);
    }

    return programa;
  }

  // ==================== APOYOS ====================
  async createApoyo(
    createApoyoDto: CreateApoyoDto,
    municipioId: string,
    userId: string,
  ): Promise<any> {
    // Validar que el beneficiario existe
    await this.findBeneficiarioById(createApoyoDto.beneficiarioId, {
      municipioId: new Types.ObjectId(municipioId),
    });

    // Validar que el programa existe
    await this.findProgramaById(createApoyoDto.programaId, {
      municipioId: new Types.ObjectId(municipioId),
    });

    // Contar apoyos previos del beneficiario
    const apoyosPrevios = await this.apoyoModel.countDocuments({
      beneficiarioId: new Types.ObjectId(createApoyoDto.beneficiarioId),
      municipioId: new Types.ObjectId(municipioId),
    });

    // Determinar modo de operación
    const usarItems = createApoyoDto.items && createApoyoDto.items.length > 0;

    if (usarItems) {
      // ==================== MODO NUEVO: Items del inventario ====================
      return await this.createApoyoConItems(
        createApoyoDto,
        municipioId,
        userId,
        apoyosPrevios,
      );
    } else {
      // ==================== MODO LEGACY: Tipo genérico ====================
      return await this.createApoyoLegacy(
        createApoyoDto,
        municipioId,
        userId,
        apoyosPrevios,
      );
    }
  }

  /**
   * Crear apoyo con items específicos del inventario (MODO ROBUSTO)
   * Usa transacciones + operaciones atómicas para garantizar atomicidad
   */
  private async createApoyoConItems(
    createApoyoDto: CreateApoyoDto,
    municipioId: string,
    userId: string,
    apoyosPrevios: number,
  ): Promise<any> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const municipioOId = new Types.ObjectId(municipioId);
      const items = createApoyoDto.items!;

      // 1️⃣ VALIDAR QUE TODOS LOS ITEMS EXISTEN Y OBTENER METADATOS
      const itemsValidados = [];

      for (const item of items) {
        const inventario = await this.inventarioModel
          .findOne({
            _id: new Types.ObjectId(item.inventarioId),
            municipioId: municipioOId,
          })
          .session(session);

        if (!inventario) {
          throw new BadRequestException(
            `Item de inventario ${item.inventarioId} no encontrado`,
          );
        }

        // Para MONETARIO: cantidad = monto en pesos a descontar; Para FISICO: cantidad = unidades
        const cantidadDescontar = item.cantidad;

        itemsValidados.push({
          inventarioId: inventario._id,
          tipo: inventario.tipo,
          tipoInventario: inventario.tipoInventario,
          valorUnitario: inventario.valorUnitario || 0,
          stockActual: inventario.stockActual, // Para stockAnterior del movimiento
          cantidad: cantidadDescontar,
        });
      }

      // 2️⃣ CREAR EL APOYO
      const folioApoyo = await this.generateFolioApoyo(municipioId, session);
      const apoyo = new this.apoyoModel({
        municipioId: municipioOId,
        beneficiarioId: new Types.ObjectId(createApoyoDto.beneficiarioId),
        programaId: new Types.ObjectId(createApoyoDto.programaId),
        tipo: createApoyoDto.tipo,
        monto: createApoyoDto.monto || 0,
        cantidad: createApoyoDto.cantidad || 1,
        items: itemsValidados.map((iv) => ({
          inventarioId: iv.inventarioId,
          cantidad: iv.cantidad,
          valorUnitario: iv.valorUnitario,
          tipo: iv.tipo,
        })),
        observaciones: createApoyoDto.observaciones,
        entregadoPor: new Types.ObjectId(userId),
        fecha: fecha.parsearFecha(createApoyoDto.fecha),
        folio: folioApoyo,
      });

      await apoyo.save({ session });

      // 3️⃣ DESCONTAR STOCK ATÓMICAMENTE Y CREAR MOVIMIENTOS
      for (const iv of itemsValidados) {
        // ✅ OPERACIÓN ATÓMICA: Solo actualiza si hay suficiente stock
        const updateResult = await this.inventarioModel.updateOne(
          {
            _id: iv.inventarioId,
            municipioId: municipioOId,
            stockActual: { $gte: iv.cantidad }, // Condición: stock >= cantidad
          },
          {
            $inc: { stockActual: -iv.cantidad }, // Descuento atómico
          },
          { session },
        );

        // Si no se actualizó ningún documento, el stock era insuficiente
        if (updateResult.matchedCount === 0) {
          throw new BadRequestException(
            `Stock insuficiente para ${iv.tipo}. Solicitado: ${iv.cantidad}`,
          );
        }

        const stockNuevo = iv.stockActual - iv.cantidad;

        // Generar folio secuencial dentro de la transacción
        const folio = await this.generateFolioMovimiento(municipioId, session);

        // Registrar movimiento OUT
        const movimiento = new this.movimientoInventarioModel({
          municipioId: municipioOId,
          programaId: new Types.ObjectId(createApoyoDto.programaId),
          inventarioId: iv.inventarioId,
          tipoMovimiento: TipoMovimiento.OUT,
          tipoRecurso: iv.tipo,
          cantidad: iv.cantidad,
          stockAnterior: iv.stockActual,
          stockNuevo,
          concepto: `Entrega de apoyo (${apoyo.folio})`,
          responsable: new Types.ObjectId(userId),
          fecha: fecha.parsearFecha(createApoyoDto.fecha),
          apoyoId: apoyo._id,
          folio, // ✅ Folio generado explícitamente
        });

        await movimiento.save({ session });
      }

      // 4️⃣ COMMIT TRANSACTION
      await session.commitTransaction();

      // 5️⃣ RETORNAR APOYO COMPLETO
      const apoyoCompleto = await this.apoyoModel
        .findById(apoyo._id)
        .populate(
          'beneficiarioId',
          'nombre apellidoPaterno apellidoMaterno curp grupoVulnerable',
        )
        .populate('programaId', 'nombre descripcion')
        .populate('entregadoPor', 'nombre email rol')
        .populate('items.inventarioId', 'tipo unidadMedida')
        .lean()
        .exec();

      return {
        ...apoyoCompleto,
        totalApoyosEntregados: apoyosPrevios + 1,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Crear apoyo con modo legacy (basado en tipo genérico)
   * Mantener compatibilidad hacia atrás con operaciones atómicas
   */
  private async createApoyoLegacy(
    createApoyoDto: CreateApoyoDto,
    municipioId: string,
    userId: string,
    apoyosPrevios: number,
  ): Promise<any> {
    const cantidad = createApoyoDto.cantidad || 1;
    const municipioOId = new Types.ObjectId(municipioId);

    // Validar que existe el inventario y obtener metadatos
    const inventario = await this.inventarioModel.findOne({
      programaId: new Types.ObjectId(createApoyoDto.programaId),
      tipo: createApoyoDto.tipo,
      municipioId: municipioOId,
    });

    if (!inventario) {
      throw new BadRequestException(
        `No hay inventario registrado para ${createApoyoDto.tipo} en este programa`,
      );
    }

    const stockAnterior = inventario.stockActual;

    // Para inventario MONETARIO, descontar el monto en pesos; para FISICO, la cantidad en unidades
    const esMonetario = inventario.tipoInventario === TipoInventario.MONETARIO;
    const cantidadDescontar = esMonetario
      ? createApoyoDto.monto || cantidad
      : cantidad;

    const apoyo = new this.apoyoModel({
      ...createApoyoDto,
      cantidad,
      municipioId: municipioOId,
      beneficiarioId: new Types.ObjectId(createApoyoDto.beneficiarioId),
      programaId: new Types.ObjectId(createApoyoDto.programaId),
      entregadoPor: new Types.ObjectId(userId),
      fecha: fecha.parsearFecha(createApoyoDto.fecha),
      folio: await this.generateFolioApoyo(municipioOId.toString()),
    });

    await apoyo.save();

    // ✅ DESCONTAR STOCK ATÓMICAMENTE
    const updateResult = await this.inventarioModel.updateOne(
      {
        _id: inventario._id,
        municipioId: municipioOId,
        stockActual: { $gte: cantidadDescontar }, // Solo actualiza si hay suficiente stock
      },
      {
        $inc: { stockActual: -cantidadDescontar }, // Operación atómica
      },
    );

    if (updateResult.matchedCount === 0) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${stockAnterior}, Solicitado: ${cantidadDescontar}`,
      );
    }

    const stockNuevo = stockAnterior - cantidadDescontar;

    // Generar folio secuencial
    const folio = await this.generateFolioMovimiento(municipioOId.toString());

    // Registrar movimiento de salida
    const movimiento = new this.movimientoInventarioModel({
      municipioId: municipioOId,
      programaId: new Types.ObjectId(createApoyoDto.programaId),
      inventarioId: inventario._id,
      tipoMovimiento: TipoMovimiento.OUT,
      tipoRecurso: createApoyoDto.tipo,
      cantidad: cantidadDescontar,
      stockAnterior,
      stockNuevo,
      concepto: `Entrega de apoyo a beneficiario`,
      responsable: new Types.ObjectId(userId),
      fecha: fecha.parsearFecha(createApoyoDto.fecha),
      apoyoId: apoyo._id,
      folio, // ✅ Folio generado explícitamente
    });

    await movimiento.save();

    // Retornar con populate completo
    const apoyoCompleto = await this.apoyoModel
      .findById(apoyo._id)
      .populate(
        'beneficiarioId',
        'nombre apellidoPaterno apellidoMaterno curp grupoVulnerable',
      )
      .populate('programaId', 'nombre descripcion')
      .populate('entregadoPor', 'nombre email rol')
      .lean()
      .exec();

    return {
      ...apoyoCompleto,
      totalApoyosEntregados: apoyosPrevios + 1,
    };
  }

  async findApoyos(
    scope: any,
    curp?: string,
    programaId?: string,
    from?: string,
    to?: string,
  ): Promise<Apoyo[]> {
    const query: any = { ...scope };

    if (curp) {
      const beneficiario = await this.beneficiarioModel.findOne({
        curp: curp.toUpperCase(),
        ...scope,
      });

      if (beneficiario) {
        query.beneficiarioId = beneficiario._id;
      } else {
        // Si no existe el beneficiario, retornar array vacío
        return [];
      }
    }

    if (programaId) {
      query.programaId = new Types.ObjectId(programaId);
    }

    if (from || to) {
      query.fecha = {};
      if (from) query.fecha.$gte = fecha.inicioDia(from);
      if (to) query.fecha.$lte = fecha.finDia(to);
    }

    return this.apoyoModel
      .find(query)
      .populate(
        'beneficiarioId',
        'nombre apellidoPaterno apellidoMaterno curp grupoVulnerable telefono',
      )
      .populate('programaId', 'nombre descripcion')
      .populate('entregadoPor', 'nombre email rol')
      .sort({ fecha: -1 })
      .exec();
  }

  async getApoyosDashboard(scope: any): Promise<any> {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const inicioMesAnterior = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const finMesAnterior = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    const [
      totalApoyos,
      apoyosMes,
      apoyosMesAnterior,
      porPrograma,
      porTipo,
      beneficiariosUnicos,
      recientes,
    ] = await Promise.all([
      // Total histórico
      this.apoyoModel.countDocuments({ ...scope }),
      // Apoyos este mes
      this.apoyoModel.countDocuments({ ...scope, fecha: { $gte: inicioMes } }),
      // Apoyos mes anterior
      this.apoyoModel.countDocuments({
        ...scope,
        fecha: { $gte: inicioMesAnterior, $lte: finMesAnterior },
      }),
      // Agrupado por programa
      this.apoyoModel.aggregate([
        { $match: { ...scope } },
        {
          $group: {
            _id: '$programaId',
            total: { $sum: 1 },
            monto: { $sum: '$monto' },
          },
        },
        {
          $lookup: {
            from: 'dif_programas',
            localField: '_id',
            foreignField: '_id',
            as: 'programa',
          },
        },
        { $unwind: { path: '$programa', preserveNullAndEmptyArrays: true } },
        {
          $project: { _id: 1, total: 1, monto: 1, nombre: '$programa.nombre' },
        },
        { $sort: { total: -1 } },
      ]),
      // Agrupado por tipo
      this.apoyoModel.aggregate([
        { $match: { ...scope } },
        {
          $group: {
            _id: '$tipo',
            total: { $sum: 1 },
            monto: { $sum: '$monto' },
          },
        },
        { $sort: { total: -1 } },
      ]),
      // Beneficiarios únicos atendidos este mes
      this.apoyoModel.distinct('beneficiarioId', {
        ...scope,
        fecha: { $gte: inicioMes },
      }),
      // Últimos 5 apoyos
      this.apoyoModel
        .find({ ...scope })
        .populate(
          'beneficiarioId',
          'nombre apellidoPaterno apellidoMaterno curp',
        )
        .populate('programaId', 'nombre')
        .sort({ fecha: -1 })
        .limit(5)
        .lean(),
    ]);

    const crecimiento =
      apoyosMesAnterior > 0
        ? Math.round(
            ((apoyosMes - apoyosMesAnterior) / apoyosMesAnterior) * 100,
          )
        : apoyosMes > 0
          ? 100
          : 0;

    return {
      resumen: {
        totalApoyos,
        apoyosMes,
        apoyosMesAnterior,
        crecimientoMensual: crecimiento,
        beneficiariosAtenidosMes: beneficiariosUnicos.length,
      },
      porPrograma,
      porTipo,
      recientes,
    };
  }

  async findApoyoById(id: string, scope: any): Promise<any> {
    const apoyo = await this.apoyoModel
      .findOne({
        _id: new Types.ObjectId(id),
        ...scope,
      })
      .populate(
        'beneficiarioId',
        'nombre apellidoPaterno apellidoMaterno curp grupoVulnerable telefono domicilio',
      )
      .populate('programaId', 'nombre descripcion observaciones')
      .populate('entregadoPor', 'nombre email rol')
      .lean()
      .exec();

    if (!apoyo) {
      throw new NotFoundException(`Apoyo con ID ${id} no encontrado`);
    }

    // Contar total de apoyos del beneficiario
    const totalApoyos = await this.apoyoModel.countDocuments({
      beneficiarioId: apoyo.beneficiarioId,
      ...scope,
    });

    return {
      ...apoyo,
      totalApoyosDelBeneficiario: totalApoyos,
    };
  }

  // ==================== INVENTARIO ====================

  /**
   * Registrar entrada de inventario
   */
  async registrarEntrada(
    createEntradaDto: CreateEntradaInventarioDto,
    municipioId: string,
    userId: string,
  ): Promise<any> {
    // Validar que el programa existe
    await this.findProgramaById(createEntradaDto.programaId, {
      municipioId: new Types.ObjectId(municipioId),
    });

    // Buscar o crear inventario para este programa+tipo
    let inventario = await this.inventarioModel.findOne({
      programaId: new Types.ObjectId(createEntradaDto.programaId),
      tipo: createEntradaDto.tipo,
      municipioId: new Types.ObjectId(municipioId),
    });

    const stockAnterior = inventario?.stockActual || 0;
    const stockNuevo = stockAnterior + createEntradaDto.cantidad;

    // Determinar tipo de inventario: usa el DTO o hereda del inventario existente
    const tipoInventario =
      createEntradaDto.tipoInventario ||
      inventario?.tipoInventario ||
      TipoInventario.FISICO;
    const esMonetario = tipoInventario === TipoInventario.MONETARIO;

    if (!inventario) {
      // Crear inventario nuevo
      inventario = new this.inventarioModel({
        municipioId: new Types.ObjectId(municipioId),
        programaId: new Types.ObjectId(createEntradaDto.programaId),
        tipo: createEntradaDto.tipo,
        tipoInventario,
        stockActual: createEntradaDto.cantidad,
        stockInicial: createEntradaDto.cantidad,
        unidadMedida: esMonetario ? 'pesos' : 'piezas',
        alertaMinima: esMonetario ? 0 : 50,
        valorUnitario: esMonetario ? 1 : (createEntradaDto.valorUnitario ?? 0),
      });
      await inventario.save();
    } else {
      // Actualizar inventario existente
      inventario.stockActual = stockNuevo;
      if (!esMonetario && createEntradaDto.valorUnitario !== undefined) {
        inventario.valorUnitario = createEntradaDto.valorUnitario;
      }
      await inventario.save();
    }

    // Generar folio secuencial
    const folio = await this.generateFolioMovimiento(municipioId);

    // Crear movimiento
    const movimiento = new this.movimientoInventarioModel({
      municipioId: new Types.ObjectId(municipioId),
      programaId: new Types.ObjectId(createEntradaDto.programaId),
      inventarioId: inventario._id,
      tipoMovimiento: TipoMovimiento.IN,
      tipoRecurso: createEntradaDto.tipo,
      cantidad: createEntradaDto.cantidad,
      stockAnterior,
      stockNuevo,
      concepto: createEntradaDto.concepto,
      responsable: new Types.ObjectId(userId),
      fecha: new Date(createEntradaDto.fecha),
      comprobante: createEntradaDto.comprobante,
      observaciones: createEntradaDto.observaciones,
      folio, // ✅ Folio generado explícitamente
    });

    await movimiento.save();

    return {
      inventario: await this.inventarioModel
        .findById(inventario._id)
        .populate('programaId', 'nombre descripcion')
        .lean(),
      movimiento: await this.movimientoInventarioModel
        .findById(movimiento._id)
        .populate('responsable', 'nombre email')
        .lean(),
    };
  }

  /**
   * Crear movimiento de inventario (entrada o salida) con operaciones atómicas
   */
  async createMovimiento(
    createMovimientoDto: any,
    municipioId: string,
    userId: string,
  ): Promise<any> {
    const municipioOId = new Types.ObjectId(municipioId);
    const programaOId = new Types.ObjectId(createMovimientoDto.programaId);
    const cantidad = createMovimientoDto.cantidad;

    // Validar que el programa existe
    await this.findProgramaById(createMovimientoDto.programaId, {
      municipioId: new Types.ObjectId(municipioId),
    });

    // Validar tipo de movimiento
    if (!['IN', 'OUT'].includes(createMovimientoDto.type)) {
      throw new ConflictException('Tipo de movimiento inválido');
    }

    // Buscar inventario existente
    let inventario = await this.inventarioModel.findOne({
      programaId: programaOId,
      tipo: createMovimientoDto.tipo,
      municipioId: municipioOId,
    });

    let inventarioId: Types.ObjectId;
    let stockAnterior: number;
    let stockNuevo: number;

    if (createMovimientoDto.type === 'IN') {
      // ==================== ENTRADA (IN) ====================
      // Determinar tipo de inventario
      const tipoInventario =
        createMovimientoDto.tipoInventario ||
        inventario?.tipoInventario ||
        TipoInventario.FISICO;
      const esMonetario = tipoInventario === TipoInventario.MONETARIO;

      if (!inventario) {
        // Crear inventario nuevo
        inventario = new this.inventarioModel({
          municipioId: municipioOId,
          programaId: programaOId,
          tipo: createMovimientoDto.tipo,
          tipoInventario,
          stockActual: cantidad,
          stockInicial: cantidad,
          unidadMedida: esMonetario ? 'pesos' : 'piezas',
          alertaMinima: esMonetario ? 0 : 50,
          valorUnitario: esMonetario
            ? 1
            : createMovimientoDto.valorUnitario || 0,
        });
        await inventario.save();

        inventarioId = inventario._id;
        stockAnterior = 0;
        stockNuevo = cantidad;
      } else {
        // ✅ INCREMENTO ATÓMICO (siempre seguro para entradas)
        stockAnterior = inventario.stockActual;
        stockNuevo = stockAnterior + cantidad;

        const updateFields: any = {
          $inc: { stockActual: cantidad },
        };

        // Actualizar valorUnitario si se proporciona (solo para FISICO)
        if (!esMonetario && createMovimientoDto.valorUnitario !== undefined) {
          updateFields.$set = {
            valorUnitario: createMovimientoDto.valorUnitario,
          };
        }

        await this.inventarioModel.updateOne(
          { _id: inventario._id },
          updateFields,
        );

        inventarioId = inventario._id;
      }
    } else {
      // ==================== SALIDA (OUT) ====================
      if (!inventario) {
        throw new NotFoundException(
          'No existe inventario para este programa y tipo de recurso',
        );
      }

      stockAnterior = inventario.stockActual;
      stockNuevo = stockAnterior - cantidad;

      // ✅ DECREMENTO ATÓMICO con validación de stock
      const updateResult = await this.inventarioModel.updateOne(
        {
          _id: inventario._id,
          municipioId: municipioOId,
          stockActual: { $gte: cantidad }, // Solo si hay suficiente stock
        },
        {
          $inc: { stockActual: -cantidad }, // Operación atómica
        },
      );

      if (updateResult.matchedCount === 0) {
        throw new ConflictException(
          `Stock insuficiente. Stock actual: ${stockAnterior}, cantidad solicitada: ${cantidad}`,
        );
      }

      inventarioId = inventario._id;
    }

    // Generar folio secuencial
    const folio = await this.generateFolioMovimiento(municipioOId.toString());

    // Crear movimiento
    const movimiento = new this.movimientoInventarioModel({
      municipioId: municipioOId,
      programaId: programaOId,
      inventarioId,
      tipoMovimiento:
        createMovimientoDto.type === 'IN'
          ? TipoMovimiento.IN
          : TipoMovimiento.OUT,
      tipoRecurso: createMovimientoDto.tipo,
      cantidad,
      stockAnterior,
      stockNuevo,
      concepto: createMovimientoDto.concepto,
      responsable: new Types.ObjectId(userId),
      fecha: new Date(createMovimientoDto.fecha),
      comprobante: createMovimientoDto.comprobante,
      observaciones: createMovimientoDto.observaciones,
      apoyoId: createMovimientoDto.apoyoId
        ? new Types.ObjectId(createMovimientoDto.apoyoId)
        : undefined,
      folio, // ✅ Folio generado explícitamente
    });

    await movimiento.save();

    return {
      inventario: await this.inventarioModel
        .findById(inventarioId)
        .populate('programaId', 'nombre descripcion')
        .lean(),
      movimiento: await this.movimientoInventarioModel
        .findById(movimiento._id)
        .populate('responsable', 'nombre email')
        .populate('apoyoId', 'folio')
        .lean(),
    };
  }

  /**
   * Consultar inventario
   */
  async getInventario(scope: any, programaId?: string): Promise<Inventario[]> {
    const query: any = { ...scope };

    if (programaId) {
      query.programaId = new Types.ObjectId(programaId);
    }

    return this.inventarioModel
      .find(query)
      .populate('programaId', 'nombre descripcion')
      .sort({ tipo: 1 })
      .exec();
  }

  /**
   * Obtener un item de inventario por ID
   */
  async findInventarioById(id: string, scope: any): Promise<Inventario | null> {
    return this.inventarioModel
      .findOne({ _id: new Types.ObjectId(id), ...scope })
      .populate('programaId', 'nombre descripcion')
      .exec();
  }

  /**
   * Actualizar un item de inventario
   */
  async updateInventarioItem(
    id: string,
    updateDto: any,
    scope: any,
  ): Promise<Inventario | null> {
    const inventario = await this.inventarioModel.findOne({
      _id: new Types.ObjectId(id),
      ...scope,
    });

    if (!inventario) {
      throw new NotFoundException('Item de inventario no encontrado');
    }

    // Actualizar campos permitidos
    if (updateDto.alertaMinima !== undefined) {
      inventario.alertaMinima = updateDto.alertaMinima;
    }
    if (updateDto.valorUnitario !== undefined) {
      inventario.valorUnitario = updateDto.valorUnitario;
    }
    if (updateDto.unidadMedida !== undefined) {
      inventario.unidadMedida = updateDto.unidadMedida;
    }
    if (updateDto.tipoInventario !== undefined) {
      inventario.tipoInventario = updateDto.tipoInventario;
      // Ajustar defaults según tipo
      if (updateDto.tipoInventario === TipoInventario.MONETARIO) {
        inventario.unidadMedida = updateDto.unidadMedida ?? 'pesos';
        inventario.valorUnitario = 1;
        inventario.alertaMinima = updateDto.alertaMinima ?? 0;
      }
    }

    await inventario.save();

    return this.inventarioModel
      .findById(id)
      .populate('programaId', 'nombre descripcion')
      .exec();
  }

  /**
   * Consultar movimientos de inventario
   */
  async getMovimientos(
    scope: any,
    filters: {
      programaId?: string;
      type?: TipoMovimiento;
      fechaDesde?: Date;
      fechaHasta?: Date;
    } = {},
  ): Promise<MovimientoInventario[]> {
    const query: any = { ...scope };

    if (filters.programaId) {
      query.programaId = new Types.ObjectId(filters.programaId);
    }
    if (filters.type) {
      query.tipoMovimiento = filters.type;
    }
    if (filters.fechaDesde || filters.fechaHasta) {
      query.fecha = {};
      if (filters.fechaDesde) query.fecha.$gte = filters.fechaDesde;
      if (filters.fechaHasta) query.fecha.$lte = filters.fechaHasta;
    }

    return this.movimientoInventarioModel
      .find(query)
      .populate('programaId', 'nombre descripcion')
      .populate('responsable', 'nombre email')
      .populate('apoyoId', 'folio beneficiarioId')
      .sort({ fecha: -1 })
      .limit(1000)
      .exec();
  }

  /**
   * Dashboard de inventario con métricas clave
   * Separado en: inventario físico (unidades) y fondos monetarios (pesos)
   */
  async getInventarioDashboard(scope: any): Promise<any> {
    const municipioId = scope.municipioId;
    const municipioOId = new Types.ObjectId(municipioId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    // ─── 1. Inventario separado por tipo ───────────────────────────────────────
    const [itemsFisicos, itemsMonetarios] = await Promise.all([
      this.inventarioModel
        .find({ municipioId, tipoInventario: TipoInventario.FISICO })
        .populate('programaId', 'nombre')
        .sort({ tipo: 1 })
        .lean(),
      this.inventarioModel
        .find({ municipioId, tipoInventario: TipoInventario.MONETARIO })
        .populate('programaId', 'nombre')
        .sort({ tipo: 1 })
        .lean(),
    ]);

    // ─── 2. Valor total inventario físico ──────────────────────────────────────
    const valorTotalFisico = itemsFisicos.reduce(
      (acc: number, item: any) =>
        acc + item.stockActual * (item.valorUnitario || 0),
      0,
    );
    const fondosDisponibles = itemsMonetarios.reduce(
      (acc: number, item: any) => acc + item.stockActual,
      0,
    );

    // ─── 3. Stock crítico (solo FISICO, alertaMinima > 0) ──────────────────────
    const itemsCriticosRaw = (itemsFisicos as any[]).filter(
      (item) => item.alertaMinima > 0 && item.stockActual <= item.alertaMinima,
    );

    const itemsCriticos = itemsCriticosRaw.map((item: any) => {
      const porcentajeStock = Math.round(
        (item.stockActual / item.alertaMinima) * 100,
      );
      const estado =
        porcentajeStock <= 30
          ? 'CRITICO'
          : porcentajeStock <= 60
            ? 'BAJO'
            : 'NORMAL';
      return {
        id: item._id.toString(),
        tipo: item.tipo,
        programa: item.programaId
          ? {
              id: item.programaId._id.toString(),
              nombre: item.programaId.nombre,
            }
          : null,
        stockActual: item.stockActual,
        alertaMinima: item.alertaMinima,
        porcentajeStock,
        estado,
        unidadMedida: item.unidadMedida,
        valorUnitario: item.valorUnitario,
      };
    });

    // ─── 4. Movimientos del mes separados por tipoInventario ───────────────────
    const movimientosMes = await this.movimientoInventarioModel.aggregate([
      {
        $match: {
          municipioId: municipioOId,
          fecha: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $lookup: {
          from: 'dif_inventario',
          localField: 'inventarioId',
          foreignField: '_id',
          as: 'inventario',
        },
      },
      { $unwind: { path: '$inventario', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            tipoMovimiento: '$tipoMovimiento',
            tipoInventario: {
              $ifNull: ['$inventario.tipoInventario', TipoInventario.FISICO],
            },
          },
          total: { $sum: 1 },
          cantidad: { $sum: '$cantidad' },
        },
      },
    ]);

    // Parsear resultado del agregado
    const movStats = {
      fisico: { IN: { total: 0, cantidad: 0 }, OUT: { total: 0, cantidad: 0 } },
      monetario: {
        IN: { total: 0, cantidad: 0 },
        OUT: { total: 0, cantidad: 0 },
      },
    };
    movimientosMes.forEach((m: any) => {
      const tipoInv =
        m._id.tipoInventario === TipoInventario.MONETARIO
          ? 'monetario'
          : 'fisico';
      const tipoMov = m._id.tipoMovimiento as 'IN' | 'OUT';
      if (tipoMov === 'IN' || tipoMov === 'OUT') {
        movStats[tipoInv][tipoMov].total = m.total;
        movStats[tipoInv][tipoMov].cantidad = m.cantidad;
      }
    });

    // ─── 5. Últimos 15 movimientos con tipo de inventario ─────────────────────
    const ultimosMovimientosRaw = await this.movimientoInventarioModel
      .find({
        municipioId: municipioOId,
        fecha: { $gte: startOfMonth, $lte: endOfMonth },
      })
      .populate('programaId', 'nombre')
      .populate('responsable', 'nombre email')
      .populate('inventarioId', 'tipo tipoInventario')
      .populate('apoyoId', 'folio')
      .sort({ fecha: -1, createdAt: -1 })
      .limit(15)
      .lean();

    const ultimosMovimientos = ultimosMovimientosRaw.map((mov: any) => ({
      id: mov._id.toString(),
      fecha: mov.fecha,
      tipoMovimiento: mov.tipoMovimiento,
      tipoInventario: mov.inventarioId?.tipoInventario || TipoInventario.FISICO,
      tipo: mov.tipoRecurso,
      programa: mov.programaId
        ? { id: mov.programaId._id.toString(), nombre: mov.programaId.nombre }
        : null,
      cantidad: mov.cantidad,
      stockAnterior: mov.stockAnterior,
      stockNuevo: mov.stockNuevo,
      concepto: mov.concepto,
      responsable: mov.responsable
        ? { nombre: mov.responsable.nombre, email: mov.responsable.email }
        : null,
      folio: mov.folio,
      apoyoFolio: mov.apoyoId?.folio || null,
      comprobante: mov.comprobante,
    }));

    // ─── 6. Fondos monetarios: lista enriquecida ──────────────────────────────
    const fondos = (itemsMonetarios as any[]).map((item: any) => ({
      id: item._id.toString(),
      tipo: item.tipo,
      programa: item.programaId
        ? { id: item.programaId._id.toString(), nombre: item.programaId.nombre }
        : null,
      disponible: item.stockActual,
      totalIngresado: item.stockInicial,
      utilizado: item.stockInicial - item.stockActual,
      porcentajeUtilizado:
        item.stockInicial > 0
          ? Math.round(
              ((item.stockInicial - item.stockActual) / item.stockInicial) *
                100,
            )
          : 0,
    }));

    return {
      resumen: {
        totalArticulosFisicos: itemsFisicos.length,
        totalFondosMonetarios: itemsMonetarios.length,
        valorTotalInventarioFisico: valorTotalFisico,
        fondosDisponibles,
      },
      inventarioFisico: {
        stockCritico: {
          total: itemsCriticos.length,
          items: itemsCriticos,
        },
        movimientosDelMes: {
          entradas: {
            totalMovimientos: movStats.fisico.IN.total,
            cantidadTotal: movStats.fisico.IN.cantidad,
          },
          salidas: {
            totalMovimientos: movStats.fisico.OUT.total,
            cantidadTotal: movStats.fisico.OUT.cantidad,
          },
          balance: movStats.fisico.IN.cantidad - movStats.fisico.OUT.cantidad,
        },
      },
      fondosMonetarios: {
        fondos,
        movimientosDelMes: {
          entradas: {
            totalMovimientos: movStats.monetario.IN.total,
            montoTotal: movStats.monetario.IN.cantidad,
          },
          salidas: {
            totalMovimientos: movStats.monetario.OUT.total,
            montoTotal: movStats.monetario.OUT.cantidad,
          },
          balance:
            movStats.monetario.IN.cantidad - movStats.monetario.OUT.cantidad,
        },
      },
      ultimosMovimientos,
    };
  }
}
