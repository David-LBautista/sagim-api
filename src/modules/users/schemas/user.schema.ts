import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '@/shared/enums';

export type UserDocument = User & Document;

@Schema({
  collection: 'auth_users',
  timestamps: true,
  toJSON: {
    transform: (_doc, ret: any) => {
      ret.telefono = ret.telefono ?? null;
      ret.moduloId = ret.moduloId ?? null;
      ret.municipioId = ret.municipioId ?? null;
      ret.avatar = ret.avatar ?? null;
      ret.ultimoAcceso = ret.ultimoAcceso ?? null;
      delete ret.password;
      delete ret.refreshToken;
      return ret;
    },
  },
})
export class User {
  @Prop({ type: Types.ObjectId, ref: 'Municipality', default: null })
  municipioId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Modulo', default: null })
  moduloId?: Types.ObjectId; // Solo para rol OPERATIVO

  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password: string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  @Prop({ type: String, enum: UserRole, required: true })
  rol: UserRole;

  @Prop({ default: true })
  activo: boolean;

  @Prop({ default: null })
  telefono?: string;

  @Prop({ default: null })
  avatar?: string;

  @Prop()
  refreshToken?: string;

  @Prop({ type: Date })
  ultimoAcceso?: Date;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes (email ya tiene unique: true, no necesita índice adicional)
UserSchema.index({ municipioId: 1 });
UserSchema.index({ moduloId: 1 });
UserSchema.index({ rol: 1 });
UserSchema.index({ activo: 1 });

// Virtual for municipality
UserSchema.virtual('municipio', {
  ref: 'Municipality',
  localField: 'municipioId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for module
UserSchema.virtual('modulo', {
  ref: 'Modulo',
  localField: 'moduloId',
  foreignField: '_id',
  justOne: true,
});
