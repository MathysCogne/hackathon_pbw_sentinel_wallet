import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Types pour notre base de données
export interface User {
  id: string;
  wallet_address: string;
  xumm_user_id: string | null;
  registered_at: string;
  last_modified: string;
  is_active: boolean;
}

export interface SentinelWallet {
  id: string;
  user_id: string;
  enabled: boolean;
  provider: string[];
  provider_config: {
    discord?: {
      webhook_url?: string;
      channel_id?: string;
    };
    telegram?: {
      bot_token?: string;
      chat_id?: string;
    };
    twilio?: {
      account_sid?: string;
      auth_token?: string;
      phone_number?: string;
    };
  };
  notification_threshold: number | null;
  last_notification_sent: string | null;
  notification_cooldown_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  name: string;
  action: string;
  description: string | null;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
  recurrence_type: 'once' | 'daily' | 'weekly' | 'monthly' | null;
  recurrence_interval: number;
  recurrence_days: number[] | null;
  start_date: string;
  next_execution: string | null;
  last_execution: string | null;
  task_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TaskExecution {
  id: string;
  task_id: string;
  execution_start: string;
  execution_end: string | null;
  status: 'success' | 'failed' | 'cancelled';
  error_message: string | null;
  execution_data: Record<string, any>;
  created_at: string;
}

export interface TransactionAnalysis {
  id: number;
  tx_hash: string;
  recommendation: 'SIGN' | 'REJECT' | 'REVIEW';
  ai_response: string;
  sender_address: string | null;
  recipient_address: string | null;
  amount: string | null;
  currency: string | null;
  confidence_score: number | null;
  risk_factors: string[] | null;
  timestamp: string;
}

// Améliorer la création du client avec des options supplémentaires
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Fonctions pour la gestion des utilisateurs
export async function createOrUpdateUser(walletAddress: string, xummUserId?: string): Promise<User> {
  try {
    console.log('Creating/updating user with:', { walletAddress, xummUserId });
    
    if (!walletAddress) {
      console.error('No wallet address provided');
      return {
        id: 'temp-missing-address-' + Date.now(),
        wallet_address: 'missing',
        xumm_user_id: null,
        registered_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        is_active: true
      };
    }

    if (!supabase || !supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase not properly initialized');
      throw new Error('Supabase configuration missing');
    }

    const userData = {
      wallet_address: walletAddress,
      xumm_user_id: xummUserId || null,
      last_modified: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('users')
      .upsert(userData, {
        onConflict: 'wallet_address',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error in Supabase query:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating/updating user:', error);
    return {
      id: 'temp-' + Date.now(),
      wallet_address: walletAddress || 'unknown',
      xumm_user_id: xummUserId || null,
      registered_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
      is_active: true
    };
  }
}

export async function getUserByWalletAddress(walletAddress: string): Promise<User | null> {
  try {
    if (!walletAddress) {
      console.error('No wallet address provided for getUserByWalletAddress');
      return null;
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error fetching user:', error);
        throw error;
      }
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserByWalletAddress:', error);
    return null;
  }
}

// Fonctions pour Sentinel Wallet
export async function getSentinelSettings(userId: string): Promise<SentinelWallet | null> {
  try {
    const { data, error } = await supabase
      .from('sentinelwallet')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching sentinel settings:', error);
    return null;
  }
}

export async function updateSentinelSettings(settings: Partial<SentinelWallet> & { user_id: string }): Promise<SentinelWallet | null> {
  try {
    const { data, error } = await supabase
      .from('sentinelwallet')
      .upsert(settings)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating sentinel settings:', error);
    return null;
  }
}

// Fonctions pour Task Manager
export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating task:', error);
    return null;
  }
}

export async function getUserTasks(userId: string): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('next_execution', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    return [];
  }
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating task:', error);
    return null;
  }
}

export async function deleteTask(taskId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting task:', error);
    return false;
  }
}

export async function getTaskExecutions(taskId: string): Promise<TaskExecution[]> {
  try {
    const { data, error } = await supabase
      .from('taskexecutions')
      .select('*')
      .eq('task_id', taskId)
      .order('execution_start', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching task executions:', error);
    return [];
  }
}

// Fonctions pour les transactions
export async function getTransactionAnalysis(txHash: string): Promise<TransactionAnalysis | null> {
  try {
    const { data, error } = await supabase
      .from('transactions_history')
      .select('*')
      .eq('tx_hash', txHash)
      .single();

    if (error) {
      console.error('Error fetching transaction analysis:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getTransactionAnalysis:', error);
    return null;
  }
}

export async function getUserTransactions(userId: string): Promise<TransactionAnalysis[]> {
  try {
    // Récupérer l'utilisateur pour obtenir son wallet_address
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return [];
    }
    
    // Récupérer les transactions où l'utilisateur est l'émetteur
    const { data, error } = await supabase
      .from('transactions_history')
      .select('*')
      .eq('sender_address', user.wallet_address)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching user transactions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserTransactions:', error);
    return [];
  }
} 