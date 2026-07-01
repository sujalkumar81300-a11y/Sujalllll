export interface User {
  id: string;
  username: string;
  balance: number;
  createdAt: number;
  lastActive: number;
  email?: string;
  phoneNumber?: string;
  country?: string;
  status: 'active' | 'suspended';
  riskScore: 'low' | 'medium' | 'high';
}

export type TransactionType = 'deposit' | 'withdraw' | 'bet' | 'win';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  previousBalance: number;
  newBalance: number;
  gameId?: string;
  hash: string;
  signature?: string;
  timestamp: number;
  status: 'success' | 'failed' | 'pending' | 'rejected';
  ipAddress: string;
  notes?: string;
}

export interface SecurityLog {
  id: string;
  timestamp: number;
  event: string;
  ipAddress: string;
  status: 'success' | 'warning' | 'error';
  details: string;
}

export interface SystemStatus {
  apiSecret: string;
  totalTransactions: number;
  totalVolume: number;
  activeUsersCount: number;
  usingSupabase?: boolean;
}
