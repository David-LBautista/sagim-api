import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CounterDocument = Counter & Document;

@Schema({ collection: 'counters', timestamps: false })
export class Counter {
  @Prop({ type: String, required: true })
  _id: string; // Ejemplo: "mov-202602", "apoyo-202602"

  @Prop({ type: Number, required: true, default: 0 })
  seq: number; // Secuencia incremental
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
