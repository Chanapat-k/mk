
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppSettings, DBMessage, Message } from '../types';

let supabase: SupabaseClient | null = null;

export const initSupabase = (url: string, key: string) => {
  if (!url || !key) {
    supabase = null;
    return;
  }
  try {
    supabase = createClient(url, key);
  } catch (e) {
    console.error("Failed to init Supabase", e);
    supabase = null;
  }
};

export const checkConnection = async (): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('chat_logs').select('count', { count: 'exact', head: true });
    return !error || error.code === 'PGRST116' || error.message.includes('relation "public.chat_logs" does not exist');
  } catch (e) {
    return false;
  }
};

export const saveMessageToDB = async (message: Message, sessionId: string): Promise<void> => {
  if (!supabase) return;

  const dbMessage: DBMessage = {
    session_id: sessionId,
    role: message.role,
    content: message.content,
    created_at: message.created_at
  };

  const { error } = await supabase
    .from('chat_logs')
    .insert([dbMessage]);

  if (error) {
    console.error('Error saving message to Supabase:', error);
  }
};

export const getHistoryFromDB = async (sessionId: string): Promise<Message[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('chat_logs')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching history:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    id: item.id?.toString() || Math.random().toString(),
    role: item.role as 'user' | 'model',
    content: item.content,
    created_at: item.created_at
  }));
};

export const getAllLogs = async (): Promise<DBMessage[]> => {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('chat_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching logs", error);
    return [];
  }
  return data as DBMessage[];
};

export interface Contact {
  sessionId: string;
  lastMessage: string;
  lastActive: string;
  messageCount: number;
}

export const getContactList = async (): Promise<Contact[]> => {
  if (!supabase) return [];

  // Fetch all logs (limit to last 500 for performance in this demo)
  const { data, error } = await supabase
    .from('chat_logs')
    .select('session_id, content, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error || !data) return [];

  const contactsMap = new Map<string, Contact>();

  data.forEach((row: any) => {
    if (!contactsMap.has(row.session_id)) {
      contactsMap.set(row.session_id, {
        sessionId: row.session_id,
        lastMessage: row.content,
        lastActive: row.created_at,
        messageCount: 1
      });
    } else {
      const contact = contactsMap.get(row.session_id)!;
      contact.messageCount += 1;
    }
  });

  return Array.from(contactsMap.values());
};
