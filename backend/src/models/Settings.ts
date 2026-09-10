import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  key: string;
  gmailConnected: boolean;
  gmailEmail?: string;
  gmailTokens?: {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
    expiry_date?: number;
  };
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  imapPassword?: string;
  imapTls?: boolean;
  aiProvider?: string;
  aiBaseUrl?: string;
  aiModel?: string;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true, default: 'global_config' },
    gmailConnected: { type: Boolean, default: false },
    gmailEmail: { type: String, default: '' },
    gmailTokens: { type: Schema.Types.Mixed },
    imapHost: { type: String, default: 'imap.gmail.com' },
    imapPort: { type: Number, default: 993 },
    imapUser: { type: String, default: '' },
    imapPassword: { type: String, default: '' },
    imapTls: { type: Boolean, default: true },
    aiProvider: { type: String, default: 'openai' },
    aiBaseUrl: { type: String, default: 'https://api.openai.com/v1' },
    aiModel: { type: String, default: 'gpt-4o-mini' }
  },
  { timestamps: true }
);

export const Settings = mongoose.model<ISettings>('Settings', SettingsSchema);
