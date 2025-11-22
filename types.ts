
export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  created_at: string;
}

export interface AppSettings {
  geminiApiKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  lineChannelAccessToken: string;
  lineChannelSecret: string;
  systemInstruction: string;
  botName: string;
  modelName: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  SIMULATOR = 'SIMULATOR',
  DATABASE = 'DATABASE',
  SETTINGS = 'SETTINGS',
  DEPLOY = 'DEPLOY',
  LIVE_CHAT = 'LIVE_CHAT'
}

// Supabase table definition types
export interface DBMessage {
  id?: number;
  session_id: string;
  role: string;
  content: string;
  created_at?: string;
}
