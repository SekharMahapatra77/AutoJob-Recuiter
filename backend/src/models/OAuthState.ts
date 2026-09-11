import mongoose, { Document, Schema } from 'mongoose';

export interface IOAuthState extends Document {
  state: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OAuthStateSchema = new Schema<IOAuthState>(
  {
    state: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
  },
  { timestamps: true }
);

export const OAuthState = mongoose.model<IOAuthState>('OAuthState', OAuthStateSchema);
