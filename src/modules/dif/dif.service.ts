import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import {
  Beneficiario,
  BeneficiarioDocument,
} from './schemas/beneficiario.schema';
import { Programa, ProgramaDocument } from './schemas/programa.schema';
import { Apoyo, ApoyoDocument } from './schemas/apoyo.schema';
import { Inventario, InventarioDocument } from './schemas/inventario.schema';
import {
  MovimientoInventario,
  MovimientoInventarioDocument,
  TipoMovimiento,
} from './schemas/movimiento-inventario.schema';
import { Counter, CounterDocument } from './schemas/counter.schema';
import {
  UnidadMedida,
  UnidadMedidaDocument,
} from './schemas/unidad-medida.schema';
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
    @InjectModel(UnidadMedida.name)
    private unidadMedidaModel: Model<UnidadMedidaDocument>,
  ) {}

  // ==================== UTILIDADES ====================
  /**
   * Generar folio secuencial para movimientos de inventario
   * Usa contador atómico para evitar colisiones bajo concurrencia
   * Compatible con transacciones MongoDB
   */
  private async generateFolioMovimiento(session?: any): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const counterId = `mov-${year}${month}`;

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

    return beneficiario.save();
  }

  async findBeneficiarios(
    scope: any,
    curp?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Beneficiario[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: any = {
      ...scope,
      activo: true,
    };

    if (curp) {
      query.curp = { $regex: curp.toUpperCase(), $options: 'i' };
    }

    const total = await this.beneficiarioModel.countDocuments(query).exec();
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const data = await this.beneficiarioModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
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

    // Si viene municipioId en scope, traer programas globales Y del municipio
    if (scope?.municipioId) {
      filter.$or = [
        { municipioId: { $exists: false } }, // Programas globales
        { municipioId: scope.municipioId }, // Programas del municipio
      ];
    }

    return this.programaModel.find(filter).sort({ nombre: 1 }).exec();
  }

  async findProgramaById(id: string, scope: any): Promise<Programa> {
    const filter: any = { _id: new Types.ObjectId(id) };

    // Si viene municipioId en scope, permitir programas globales Y del municipio
    if (scope?.municipioId) {
      filter.$or = [
        { municipioId: { $exists: false } }, // Programas globales
        { municipioId: scope.municipioId }, // Programas del municipio
      ];
    }

    const programa = await this.programaModel.findOne(filter).exec();

    if (!programa) {
      throw new NotFoundException(`Programa con ID ${id} no encontrado`);
    }

    return programa;
  }

  // ==================== UNIDADES DE MEDIDA ====================
  async findUnidadesMedida(): Promise<UnidadMedida[]> {
    return this.unidadMedidaModel
      .find({ activo: true })
      .sort({ clave: 1 })
      .exec();
  }

  async findUnidadMedidaByClave(clave: string): Promise<UnidadMedida> {
    const unidad = await this.unidadMedidaModel
      .findOne({ clave: clave.toUpperCase(), activo: true })
      .exec();

    if (!unidad) {
      throw new NotFoundException(
        `Unidad de medida con clave ${clave} no encontrada`,
      );
    }

    return unidad;
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

        // Solo validamos existencia, el stock se valida atómicamente después
        itemsValidados.push({
          inventarioId: inventario._id,
          tipo: inventario.tipo,
          valorUnitario: inventario.valorUnitario || 0,
          stockActual: inventario.stockActual, // Para stockAnterior del movimiento
          cantidad: item.cantidad,
        });
      }

      // 2️⃣ CREAR EL APOYO
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
        fecha: startOfDay(parseISO(createApoyoDto.fecha)),
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
        const folio = await this.generateFolioMovimiento(session);

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
          fecha: startOfDay(parseISO(createApoyoDto.fecha)),
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

    const apoyo = new this.apoyoModel({
      ...createApoyoDto,
      cantidad,
      municipioId: municipioOId,
      beneficiarioId: new Types.ObjectId(createApoyoDto.beneficiarioId),
      programaId: new Types.ObjectId(createApoyoDto.programaId),
      entregadoPor: new Types.ObjectId(userId),
      fecha: startOfDay(parseISO(createApoyoDto.fecha)),
      // El folio se genera automáticamente en el pre-save hook del schema
    });

    await apoyo.save();

    // ✅ DESCONTAR STOCK ATÓMICAMENTE
    const updateResult = await this.inventarioModel.updateOne(
      {
        _id: inventario._id,
        municipioId: municipioOId,
        stockActual: { $gte: cantidad }, // Solo actualiza si hay suficiente stock
      },
      {
        $inc: { stockActual: -cantidad }, // Operación atómica
      },
    );

    if (updateResult.matchedCount === 0) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${stockAnterior}, Solicitado: ${cantidad}`,
      );
    }

    const stockNuevo = stockAnterior - cantidad;

    // Generar folio secuencial
    const folio = await this.generateFolioMovimiento();

    // Registrar movimiento de salida
    const movimiento = new this.movimientoInventarioModel({
      municipioId: municipioOId,
      programaId: new Types.ObjectId(createApoyoDto.programaId),
      inventarioId: inventario._id,
      tipoMovimiento: TipoMovimiento.OUT,
      tipoRecurso: createApoyoDto.tipo,
      cantidad,
      stockAnterior,
      stockNuevo,
      concepto: `Entrega de apoyo a beneficiario`,
      responsable: new Types.ObjectId(userId),
      fecha: startOfDay(parseISO(createApoyoDto.fecha)),
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
      if (from) {
        query.fecha.$gte = startOfDay(parseISO(from));
      }
      if (to) {
        query.fecha.$lte = endOfDay(parseISO(to));
      }
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

    if (!inventario) {
      // Crear inventario nuevo
      inventario = new this.inventarioModel({
        municipioId: new Types.ObjectId(municipioId),
        programaId: new Types.ObjectId(createEntradaDto.programaId),
        tipo: createEntradaDto.tipo,
        stockActual: createEntradaDto.cantidad,
        stockInicial: createEntradaDto.cantidad,
        unidadMedida: 'piezas',
        alertaMinima: 50,
        valorUnitario: createEntradaDto.valorUnitario,
      });
      await inventario.save();
    } else {
      // Actualizar inventario existente
      inventario.stockActual = stockNuevo;
      if (createEntradaDto.valorUnitario) {
        inventario.valorUnitario = createEntradaDto.valorUnitario;
      }
      await inventario.save();
    }

    // Generar folio secuencial
    const folio = await this.generateFolioMovimiento();

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
      if (!inventario) {
        // Crear inventario nuevo
        inventario = new this.inventarioModel({
          municipioId: municipioOId,
          programaId: programaOId,
          tipo: createMovimientoDto.tipo,
          stockActual: cantidad,
          stockInicial: cantidad,
          unidadMedida: 'piezas',
          alertaMinima: 50,
          valorUnitario: createMovimientoDto.valorUnitario || 0,
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

        // Actualizar valorUnitario si se proporciona
        if (createMovimientoDto.valorUnitario !== undefined) {
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
    const folio = await this.generateFolioMovimiento();

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
   */
  async getInventarioDashboard(scope: any): Promise<any> {
    const municipioId = scope.municipioId;

    // 1. Total de items en inventario
    const totalItems = await this.inventarioModel.countDocuments({
      municipioId,
    });

    // 2. Items con stock crítico (por debajo de alerta mínima)
    const itemsCriticosRaw = await this.inventarioModel
      .find({
        municipioId,
        $expr: { $lte: ['$stockActual', '$alertaMinima'] },
      })
      .populate('programaId', 'nombre')
      .sort({ stockActual: 1 })
      .limit(10)
      .lean();

    // Formatear items críticos con cálculos adicionales
    const itemsCriticos = itemsCriticosRaw.map((item: any) => {
      const porcentajeStock =
        item.alertaMinima > 0
          ? Math.round((item.stockActual / item.alertaMinima) * 100)
          : 0;

      // Determinar estado basado en porcentaje
      let estado: string;
      if (porcentajeStock <= 30) {
        estado = 'CRITICO';
      } else if (porcentajeStock <= 60) {
        estado = 'BAJO';
      } else {
        estado = 'NORMAL';
      }

      return {
        id: item._id.toString(),
        tipo: item.tipo,
        programa: {
          id: item.programaId._id.toString(),
          nombre: item.programaId.nombre,
        },
        stockActual: item.stockActual,
        alertaMinima: item.alertaMinima,
        porcentajeStock,
        estado,
        unidadMedida: item.unidadMedida,
        valorUnitario: item.valorUnitario,
      };
    });

    const totalItemsCriticos = itemsCriticos.length;

    // 3. Movimientos del mes actual
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

    const movimientosDelMes = await this.movimientoInventarioModel.aggregate([
      {
        $match: {
          municipioId: new Types.ObjectId(municipioId),
          fecha: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: '$tipoMovimiento',
          total: { $sum: 1 },
          cantidad: { $sum: '$cantidad' },
        },
      },
    ]);

    // Formatear los movimientos del mes
    let entradasTotal = 0;
    let entradasCantidad = 0;
    let salidasTotal = 0;
    let salidasCantidad = 0;

    movimientosDelMes.forEach((mov) => {
      if (mov._id === 'IN') {
        entradasTotal = mov.total;
        entradasCantidad = mov.cantidad;
      } else if (mov._id === 'OUT') {
        salidasTotal = mov.total;
        salidasCantidad = mov.cantidad;
      }
    });

    const balance = entradasCantidad - salidasCantidad;

    // 4. Últimos movimientos del mes (para tabla en frontend)
    const ultimosMovimientos = await this.movimientoInventarioModel
      .find({
        municipioId: new Types.ObjectId(municipioId),
        fecha: { $gte: startOfMonth, $lte: endOfMonth },
      })
      .populate('programaId', 'nombre')
      .populate('responsable', 'nombre email')
      .populate('inventarioId', 'tipo')
      .populate('apoyoId', 'folio')
      .sort({ fecha: -1, createdAt: -1 })
      .limit(10)
      .lean();

    const movimientosFormateados = ultimosMovimientos.map((mov: any) => ({
      id: mov._id.toString(),
      fecha: mov.fecha,
      tipoMovimiento: mov.tipoMovimiento,
      tipo: mov.tipoRecurso,
      programa: mov.programaId
        ? {
            id: mov.programaId._id.toString(),
            nombre: mov.programaId.nombre,
          }
        : null,
      cantidad: mov.cantidad,
      stockAnterior: mov.stockAnterior,
      stockNuevo: mov.stockNuevo,
      concepto: mov.concepto,
      responsable: mov.responsable
        ? {
            nombre: mov.responsable.nombre,
            email: mov.responsable.email,
          }
        : null,
      folio: mov.folio,
      apoyoFolio: mov.apoyoId?.folio || null,
      comprobante: mov.comprobante,
    }));

    // 5. Valor total del inventario
    const valorTotal = await this.inventarioModel.aggregate([
      {
        $match: {
          municipioId: new Types.ObjectId(municipioId),
        },
      },
      {
        $project: {
          valorTotal: {
            $multiply: ['$stockActual', { $ifNull: ['$valorUnitario', 0] }],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$valorTotal' },
        },
      },
    ]);

    return {
      resumen: {
        totalItems,
        valorTotalInventario: valorTotal[0]?.total || 0,
      },
      stockCritico: {
        total: totalItemsCriticos,
        items: itemsCriticos,
      },
      movimientosDelMes: {
        entradas: {
          totalMovimientos: entradasTotal,
          cantidadTotal: entradasCantidad,
        },
        salidas: {
          totalMovimientos: salidasTotal,
          cantidadTotal: salidasCantidad,
        },
        balance,
        ultimosMovimientos: movimientosFormateados,
      },
    };
  }
}
