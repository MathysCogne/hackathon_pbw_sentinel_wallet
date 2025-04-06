// Types pour les utilisateurs
export interface User {
  id: string;
  wallet_address: string;
  xumm_user_id: string;
  registered_at: string;
  last_modified: string;
  is_active: boolean;
}

// Types pour Sentinel Wallet
export interface SentinelWallet {
  id: string;
  user_id: string;
  enabled: boolean;
  provider: string[];
  provider_config: Record<string, any>;
  notification_threshold: number;
  last_notification_sent: string | null;
  notification_cooldown_minutes: number;
  created_at: string;
  updated_at: string;
}

// Types pour les tâches
export type TaskStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
export type RecurrenceType = 'once' | 'minutely' | 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  user_id: string;
  name: string;
  action: string;
  description: string | null;
  status: TaskStatus;
  recurrence_type: RecurrenceType | null;
  recurrence_interval: number;
  recurrence_days: number[] | null;
  start_date: string;
  next_execution: string | null;
  last_execution: string | null;
  task_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Types pour les exécutions de tâches
export type ExecutionStatus = 'success' | 'failed' | 'cancelled';

export interface TaskExecution {
  id: string;
  task_id: string;
  execution_start: string;
  execution_end: string | null;
  status: ExecutionStatus;
  error_message: string | null;
  execution_data: Record<string, any>;
  created_at: string;
}

// Types pour les transactions XRPL
export interface XrplTransaction {
  hash: string;
  TransactionType: string;
  Account: string;
  Destination?: string;
  Amount?: string | Record<string, any>;
  Fee: string;
  Sequence: number;
  SigningPubKey?: string;
  date?: number;
  meta?: Record<string, any>;
  [key: string]: any;
}

// Types pour les analyses de transactions
export interface TransactionAnalysis {
  approved: boolean;
  reason: string;
  risk_score?: number;
  details?: Record<string, any>;
}

// Types pour les payloads XUMM
export interface XummPayload {
  uuid: string;
  payload_request: Record<string, any>;
  payload_response: Record<string, any>;
  status: 'created' | 'signed' | 'rejected' | 'expired';
  payload_result?: Record<string, any>;
  created_at: string;
  updated_at?: string;
} 