import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { User, Transaction, SecurityLog, SystemStatus, TransactionType } from './types';

const DB_FILE_PATH = path.join(process.cwd(), 'db_storage.json');

// Pull Supabase configuration from environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

let supabase: any = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.error('Error initializing Supabase client:', err);
  }
}

interface Schema {
  users: Record<string, User>;
  transactions: Transaction[];
  securityLogs: SecurityLog[];
  apiSecret: string;
}

const DEFAULT_SECRET = 'gam_sec_' + crypto.randomBytes(16).toString('hex');

// Mapping functions for database compatibility (camelCase <-> snake_case)
function mapUserFromDb(row: any): User {
  return {
    id: row.id,
    username: row.username,
    balance: Number(row.balance),
    createdAt: Number(row.created_at),
    lastActive: Number(row.last_active),
    email: row.email,
    phoneNumber: row.phone_number,
    country: row.country,
    status: row.status as 'active' | 'suspended',
    riskScore: row.risk_score as 'low' | 'medium' | 'high'
  };
}

function mapUserToDb(user: User): any {
  return {
    id: user.id,
    username: user.username,
    balance: user.balance,
    created_at: user.createdAt,
    last_active: user.lastActive,
    email: user.email,
    phone_number: user.phoneNumber,
    country: user.country,
    status: user.status,
    risk_score: user.riskScore
  };
}

function mapTransactionFromDb(row: any): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as TransactionType,
    amount: Number(row.amount),
    previousBalance: Number(row.previous_balance),
    newBalance: Number(row.new_balance),
    gameId: row.game_id || undefined,
    notes: row.notes || undefined,
    hash: row.hash,
    signature: row.signature || undefined,
    timestamp: Number(row.timestamp),
    status: row.status as any,
    ipAddress: row.ip_address
  };
}

function mapTransactionToDb(tx: Transaction): any {
  return {
    id: tx.id,
    user_id: tx.userId,
    type: tx.type,
    amount: tx.amount,
    previous_balance: tx.previousBalance,
    new_balance: tx.newBalance,
    game_id: tx.gameId || null,
    notes: tx.notes || null,
    hash: tx.hash,
    signature: tx.signature || null,
    timestamp: tx.timestamp,
    status: tx.status,
    ip_address: tx.ipAddress
  };
}

function mapSecurityLogFromDb(row: any): SecurityLog {
  return {
    id: row.id,
    timestamp: Number(row.timestamp),
    event: row.event,
    ipAddress: row.ip_address,
    status: row.status as any,
    details: row.details
  };
}

function mapSecurityLogToDb(log: SecurityLog): any {
  return {
    id: log.id,
    timestamp: log.timestamp,
    event: log.event,
    ip_address: log.ipAddress,
    status: log.status,
    details: log.details
  };
}

class Database {
  private data: Schema;
  public usingSupabase: boolean = false;

  constructor() {
    this.data = this.load();
    this.checkSupabaseConnection();
  }

  private load(): Schema {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(fileContent);
        
        const users = parsed.users || {};
        for (const id in users) {
          if (!users[id].email) users[id].email = `${users[id].id}@gambling-net.com`;
          if (!users[id].phoneNumber) users[id].phoneNumber = '+91 98765 43210';
          if (!users[id].country) users[id].country = 'India';
          if (!users[id].status) users[id].status = 'active';
          if (!users[id].riskScore) users[id].riskScore = 'low';
        }

        return {
          users,
          transactions: parsed.transactions || [],
          securityLogs: parsed.securityLogs || [],
          apiSecret: parsed.apiSecret || DEFAULT_SECRET,
        };
      }
    } catch (e) {
      console.error('Error loading local database:', e);
    }

    // Default setup if local json does not exist
    const defaultData: Schema = {
      users: {
        'demo_user_1': {
          id: 'demo_user_1',
          username: 'LuckyGambler99',
          balance: 5000.00,
          createdAt: Date.now() - 24 * 60 * 60 * 1000,
          lastActive: Date.now() - 5 * 60 * 1000,
          email: 'lucky99@gamblemail.com',
          phoneNumber: '+91 99887 76655',
          country: 'India',
          status: 'active',
          riskScore: 'low',
        },
        'demo_user_2': {
          id: 'demo_user_2',
          username: 'HighRollerPro',
          balance: 15000.00,
          createdAt: Date.now() - 12 * 60 * 60 * 1000,
          lastActive: Date.now() - 15 * 60 * 1000,
          email: 'pro_roller@highstakes.io',
          phoneNumber: '+91 88776 65544',
          country: 'India',
          status: 'active',
          riskScore: 'medium',
        },
        'demo_user_3': {
          id: 'demo_user_3',
          username: 'SuspiciousSpin',
          balance: 750.00,
          createdAt: Date.now() - 36 * 60 * 60 * 1000,
          lastActive: Date.now() - 2 * 60 * 60 * 1000,
          email: 'spin_hacker@temp-mail.org',
          phoneNumber: '+1 415 555 2671',
          country: 'United States',
          status: 'suspended',
          riskScore: 'high',
        }
      },
      transactions: [],
      securityLogs: [],
      apiSecret: DEFAULT_SECRET,
    };

    const now = Date.now();
    const mockTxs: Transaction[] = [
      {
        id: 'tx_init_dep1',
        userId: 'demo_user_1',
        type: 'deposit',
        amount: 5000.00,
        previousBalance: 0,
        newBalance: 5000.00,
        timestamp: now - 4 * 60 * 60 * 1000,
        status: 'success',
        ipAddress: '103.45.21.90',
        hash: 'hash_init_dep1',
        notes: 'Initial credit deposit approved.'
      },
      {
        id: 'tx_init_dep2',
        userId: 'demo_user_2',
        type: 'deposit',
        amount: 15000.00,
        previousBalance: 0,
        newBalance: 15000.00,
        timestamp: now - 3 * 60 * 60 * 1000,
        status: 'success',
        ipAddress: '152.12.89.43',
        hash: 'hash_init_dep2',
        notes: 'VIP wire transfer deposit'
      },
      {
        id: 'tx_pend_dep',
        userId: 'demo_user_1',
        type: 'deposit',
        amount: 2500.00,
        previousBalance: 5000.00,
        newBalance: 5000.00,
        timestamp: now - 30 * 60 * 1000,
        status: 'pending',
        ipAddress: '103.45.21.90',
        hash: 'hash_pend_dep',
        notes: 'Manual Deposit Request - Bank Transfer Receipt uploaded'
      },
      {
        id: 'tx_pend_with',
        userId: 'demo_user_2',
        type: 'withdraw',
        amount: 3000.00,
        previousBalance: 15000.00,
        newBalance: 15000.00,
        timestamp: now - 15 * 60 * 1000,
        status: 'pending',
        ipAddress: '152.12.89.43',
        hash: 'hash_pend_with',
        notes: 'Manual Withdrawal Request - UPI transfer requested'
      }
    ];

    defaultData.transactions = mockTxs;

    defaultData.securityLogs.push({
      id: 'log_' + crypto.randomUUID(),
      timestamp: Date.now(),
      event: 'SYSTEM_INITIALIZED',
      ipAddress: '127.0.0.1',
      status: 'success',
      details: 'Secure Wallet Database engine successfully started. Rich user profiles and pending audit cues injected.',
    });

    this.save(defaultData);
    return defaultData;
  }

  private save(data: Schema = this.data): void {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving local database:', e);
    }
  }

  private async checkSupabaseConnection() {
    if (!supabase) {
      console.log('Supabase env variables missing. Falling back to Local JSON database.');
      this.usingSupabase = false;
      return;
    }

    try {
      // Test if we can fetch users table
      const { error } = await supabase.from('users').select('id').limit(1);
      if (error) {
        console.warn('Supabase connected but "users" table query failed:', error.message);
        this.usingSupabase = false;
        
        this.addSecurityLog(
          'SUPABASE_SCHEMA_WARNING',
          'system',
          'warning',
          `Supabase connected but table check failed: ${error.message}. Please execute schema SQL.`
        );
      } else {
        console.log('✅ Supabase connected successfully! Using Supabase storage.');
        this.usingSupabase = true;
        await this.seedSupabaseIfEmpty();
        
        await this.addSecurityLog(
          'SUPABASE_ACTIVE',
          'system',
          'success',
          'Successfully connected to remote Supabase database and confirmed schemas.'
        );
      }
    } catch (e: any) {
      console.error('Failed to establish Supabase connection:', e.message);
      this.usingSupabase = false;
    }
  }

  private async seedSupabaseIfEmpty() {
    try {
      const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
      if (!error && count === 0) {
        console.log('Supabase users table is empty. Seeding initial data...');
        
        // Seed users
        const mockUsers = [
          {
            id: 'demo_user_1',
            username: 'LuckyGambler99',
            balance: 5000.00,
            created_at: Date.now() - 24 * 60 * 60 * 1000,
            last_active: Date.now() - 5 * 60 * 1000,
            email: 'lucky99@gamblemail.com',
            phone_number: '+91 99887 76655',
            country: 'India',
            status: 'active',
            risk_score: 'low',
          },
          {
            id: 'demo_user_2',
            username: 'HighRollerPro',
            balance: 15000.00,
            created_at: Date.now() - 12 * 60 * 60 * 1000,
            last_active: Date.now() - 15 * 60 * 1000,
            email: 'pro_roller@highstakes.io',
            phone_number: '+91 88776 65544',
            country: 'India',
            status: 'active',
            risk_score: 'medium',
          },
          {
            id: 'demo_user_3',
            username: 'SuspiciousSpin',
            balance: 750.00,
            created_at: Date.now() - 36 * 60 * 60 * 1000,
            last_active: Date.now() - 2 * 60 * 60 * 1000,
            email: 'spin_hacker@temp-mail.org',
            phone_number: '+1 415 555 2671',
            country: 'United States',
            status: 'suspended',
            risk_score: 'high',
          }
        ];
        await supabase.from('users').insert(mockUsers);

        // Seed transactions
        const now = Date.now();
        const mockTxs = [
          {
            id: 'tx_init_dep1',
            user_id: 'demo_user_1',
            type: 'deposit',
            amount: 5000.00,
            previous_balance: 0,
            new_balance: 5000.00,
            timestamp: now - 4 * 60 * 60 * 1000,
            status: 'success',
            ip_address: '103.45.21.90',
            hash: 'hash_init_dep1',
            notes: 'Initial credit deposit approved.'
          },
          {
            id: 'tx_init_dep2',
            user_id: 'demo_user_2',
            type: 'deposit',
            amount: 15000.00,
            previous_balance: 0,
            new_balance: 15000.00,
            timestamp: now - 3 * 60 * 60 * 1000,
            status: 'success',
            ip_address: '152.12.89.43',
            hash: 'hash_init_dep2',
            notes: 'VIP wire transfer deposit'
          },
          {
            id: 'tx_pend_dep',
            user_id: 'demo_user_1',
            type: 'deposit',
            amount: 2500.00,
            previous_balance: 5000.00,
            new_balance: 5000.00,
            timestamp: now - 30 * 60 * 1000,
            status: 'pending',
            ip_address: '103.45.21.90',
            hash: 'hash_pend_dep',
            notes: 'Manual Deposit Request - Bank Transfer Receipt uploaded'
          },
          {
            id: 'tx_pend_with',
            user_id: 'demo_user_2',
            type: 'withdraw',
            amount: 3000.00,
            previous_balance: 15000.00,
            new_balance: 15000.00,
            timestamp: now - 15 * 60 * 1000,
            status: 'pending',
            ip_address: '152.12.89.43',
            hash: 'hash_pend_with',
            notes: 'Manual Withdrawal Request - UPI transfer requested'
          }
        ];
        await supabase.from('transactions').insert(mockTxs);

        // Seed API Shared Secret in system_settings
        await supabase.from('system_settings').upsert({ key: 'api_secret', value: this.data.apiSecret });

        // Add log
        const log = {
          id: 'log_' + crypto.randomUUID(),
          timestamp: Date.now(),
          event: 'SUPABASE_SEEDED',
          ip_address: '127.0.0.1',
          status: 'success',
          details: 'Supabase storage populated with standard demo wallets and baseline system metrics successfully.'
        };
        await supabase.from('security_logs').insert(log);
      }
    } catch (e) {
      console.error('Error seeding Supabase:', e);
    }
  }

  public async getUsers(): Promise<User[]> {
    if (this.usingSupabase) {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return data.map(mapUserFromDb);
      }
    }
    return Object.values(this.data.users);
  }

  public async getUser(userId: string): Promise<User | undefined> {
    if (this.usingSupabase) {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      if (!error && data) {
        return mapUserFromDb(data);
      }
      return undefined;
    }
    return this.data.users[userId];
  }

  public async createUser(
    userId: string, 
    username: string, 
    initialBalance = 1000.00, 
    email?: string, 
    phoneNumber?: string, 
    country?: string
  ): Promise<User> {
    const newUser: User = {
      id: userId,
      username: username,
      balance: initialBalance,
      createdAt: Date.now(),
      lastActive: Date.now(),
      email: email || `${userId}@gambling-net.com`,
      phoneNumber: phoneNumber || '+91 99999 88888',
      country: country || 'India',
      status: 'active',
      riskScore: 'low',
    };

    if (this.usingSupabase) {
      const existing = await this.getUser(userId);
      if (existing) {
        throw new Error(`User with ID ${userId} already exists.`);
      }

      const { error } = await supabase.from('users').insert(mapUserToDb(newUser));
      if (error) throw new Error(error.message);

      await this.addSecurityLog(
        'USER_CREATED',
        'system',
        'success',
        `New user user_id=${userId} name=${username} balance=${initialBalance}`
      );
      return newUser;
    }

    if (this.data.users[userId]) {
      throw new Error(`User with ID ${userId} already exists.`);
    }

    this.data.users[userId] = newUser;
    await this.addSecurityLog(
      'USER_CREATED',
      'system',
      'success',
      `New user user_id=${userId} name=${username} balance=${initialBalance}`
    );
    this.save();
    return newUser;
  }

  public async updateUserProfile(
    userId: string, 
    profile: Partial<Omit<User, 'id' | 'balance' | 'createdAt' | 'lastActive'>>, 
    ipAddress: string
  ): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found.`);
    }

    if (profile.username !== undefined) user.username = profile.username;
    if (profile.email !== undefined) user.email = profile.email;
    if (profile.phoneNumber !== undefined) user.phoneNumber = profile.phoneNumber;
    if (profile.country !== undefined) user.country = profile.country;
    if (profile.status !== undefined) user.status = profile.status;
    if (profile.riskScore !== undefined) user.riskScore = profile.riskScore;

    user.lastActive = Date.now();

    if (this.usingSupabase) {
      const { error } = await supabase.from('users').update(mapUserToDb(user)).eq('id', userId);
      if (error) throw new Error(error.message);

      await this.addSecurityLog(
        'USER_PROFILE_UPDATED',
        ipAddress,
        'success',
        `User ${userId} profile updated. Status: ${user.status}, Risk: ${user.riskScore}`
      );
      return user;
    }

    this.data.users[userId] = user;
    await this.addSecurityLog(
      'USER_PROFILE_UPDATED',
      ipAddress,
      'success',
      `User ${userId} profile updated. Status: ${user.status}, Risk: ${user.riskScore}`
    );
    this.save();
    return user;
  }

  public async updateUserBalance(userId: string, amount: number, ipAddress: string): Promise<{ user: User, prevBalance: number }> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found.`);
    }

    if (user.status === 'suspended') {
      throw new Error(`Transaction blocked. Account of player "${user.username}" is suspended.`);
    }

    const prevBalance = user.balance;
    const newBalance = prevBalance + amount;

    if (newBalance < 0) {
      throw new Error(`Insufficient funds. Requested deduction: ${Math.abs(amount)}, Current balance: ${prevBalance}`);
    }

    user.balance = Math.round(newBalance * 100) / 100;
    user.lastActive = Date.now();

    if (this.usingSupabase) {
      const { error } = await supabase.from('users').update({ balance: user.balance, last_active: user.lastActive }).eq('id', userId);
      if (error) throw new Error(error.message);
      return { user, prevBalance };
    }

    this.save();
    return { user, prevBalance };
  }

  public async addTransaction(tx: Omit<Transaction, 'id' | 'hash' | 'timestamp'>, ipAddress: string): Promise<Transaction> {
    const txId = 'tx_' + crypto.randomBytes(8).toString('hex');
    
    // Create secure hash
    const hashData = `${txId}:${tx.userId}:${tx.type}:${tx.amount}:${tx.previousBalance}:${tx.newBalance}:${tx.gameId || ''}`;
    const hash = crypto.createHash('sha256').update(hashData).digest('hex');

    const transaction: Transaction = {
      ...tx,
      id: txId,
      hash,
      timestamp: Date.now(),
    };

    if (this.usingSupabase) {
      const { error } = await supabase.from('transactions').insert(mapTransactionToDb(transaction));
      if (error) console.error('Error inserting transaction into Supabase:', error.message);
      return transaction;
    }

    this.data.transactions.unshift(transaction);
    this.save();
    return transaction;
  }

  public async approveTransaction(txId: string, ipAddress: string): Promise<Transaction> {
    let tx: Transaction | undefined;
    if (this.usingSupabase) {
      const { data, error } = await supabase.from('transactions').select('*').eq('id', txId).maybeSingle();
      if (!error && data) {
        tx = mapTransactionFromDb(data);
      }
    } else {
      tx = this.data.transactions.find(t => t.id === txId);
    }

    if (!tx) {
      throw new Error(`Transaction ${txId} not found.`);
    }
    if (tx.status !== 'pending') {
      throw new Error(`Transaction is already processed. Current status: ${tx.status}`);
    }

    const user = await this.getUser(tx.userId);
    if (!user) {
      tx.status = 'failed';
      if (this.usingSupabase) {
        await supabase.from('transactions').update({ status: 'failed' }).eq('id', txId);
      } else {
        this.save();
      }
      throw new Error(`User ${tx.userId} not found.`);
    }

    if (user.status === 'suspended') {
      throw new Error(`Cannot approve transaction. User is suspended.`);
    }

    let balanceDelta = tx.amount;
    if (tx.type === 'withdraw' || tx.type === 'bet') {
      balanceDelta = -tx.amount;
    }

    const prevBalance = user.balance;
    const newBalance = prevBalance + balanceDelta;
    if (newBalance < 0) {
      tx.status = 'failed';
      if (this.usingSupabase) {
        await supabase.from('transactions').update({ status: 'failed' }).eq('id', txId);
      } else {
        this.save();
      }
      throw new Error(`Insufficient funds. Player balance is $${prevBalance}, but approval of this withdrawal requires $${tx.amount}.`);
    }

    user.balance = Math.round(newBalance * 100) / 100;
    user.lastActive = Date.now();

    tx.previousBalance = prevBalance;
    tx.newBalance = user.balance;
    tx.status = 'success';

    const hashData = `${tx.id}:${tx.userId}:${tx.type}:${tx.amount}:${tx.previousBalance}:${tx.newBalance}:${tx.gameId || ''}`;
    tx.hash = crypto.createHash('sha256').update(hashData).digest('hex');

    if (this.usingSupabase) {
      const { error: userError } = await supabase.from('users').update({ balance: user.balance, last_active: user.lastActive }).eq('id', user.id);
      if (userError) throw new Error(userError.message);

      const { error: txError } = await supabase.from('transactions').update(mapTransactionToDb(tx)).eq('id', tx.id);
      if (txError) throw new Error(txError.message);

      await this.addSecurityLog(
        'TRANSACTION_APPROVED_MANUALLY',
        ipAddress,
        'success',
        `Manual ${tx.type} of $${tx.amount} APPROVED for user "${user.username}". New Balance: $${user.balance}`
      );
      return tx;
    }

    await this.addSecurityLog(
      'TRANSACTION_APPROVED_MANUALLY',
      ipAddress,
      'success',
      `Manual ${tx.type} of $${tx.amount} APPROVED for user "${user.username}". New Balance: $${user.balance}`
    );

    this.save();
    return tx;
  }

  public async rejectTransaction(txId: string, ipAddress: string): Promise<Transaction> {
    let tx: Transaction | undefined;
    if (this.usingSupabase) {
      const { data, error } = await supabase.from('transactions').select('*').eq('id', txId).maybeSingle();
      if (!error && data) {
        tx = mapTransactionFromDb(data);
      }
    } else {
      tx = this.data.transactions.find(t => t.id === txId);
    }

    if (!tx) {
      throw new Error(`Transaction ${txId} not found.`);
    }
    if (tx.status !== 'pending') {
      throw new Error(`Transaction is already processed. Current status: ${tx.status}`);
    }

    tx.status = 'rejected';

    if (this.usingSupabase) {
      const { error } = await supabase.from('transactions').update({ status: 'rejected' }).eq('id', txId);
      if (error) throw new Error(error.message);

      await this.addSecurityLog(
        'TRANSACTION_REJECTED_MANUALLY',
        ipAddress,
        'warning',
        `Manual ${tx.type} of $${tx.amount} REJECTED for user "${tx.userId}". Balance untouched.`
      );
      return tx;
    }

    await this.addSecurityLog(
      'TRANSACTION_REJECTED_MANUALLY',
      ipAddress,
      'warning',
      `Manual ${tx.type} of $${tx.amount} REJECTED for user "${tx.userId}". Balance untouched.`
    );

    this.save();
    return tx;
  }

  public async getTransactions(userId?: string): Promise<Transaction[]> {
    if (this.usingSupabase) {
      let query = supabase.from('transactions').select('*').order('timestamp', { ascending: false });
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data.map(mapTransactionFromDb);
      }
    }
    if (userId) {
      return this.data.transactions.filter(t => t.userId === userId);
    }
    return this.data.transactions;
  }

  public async getSecurityLogs(): Promise<SecurityLog[]> {
    if (this.usingSupabase) {
      const { data, error } = await supabase.from('security_logs').select('*').order('timestamp', { ascending: false }).limit(500);
      if (!error && data) {
        return data.map(mapSecurityLogFromDb);
      }
    }
    return this.data.securityLogs;
  }

  public async addSecurityLog(event: string, ipAddress: string, status: 'success' | 'warning' | 'error', details: string): Promise<void> {
    const log: SecurityLog = {
      id: 'log_' + crypto.randomUUID(),
      timestamp: Date.now(),
      event,
      ipAddress,
      status,
      details,
    };

    if (this.usingSupabase) {
      const { error } = await supabase.from('security_logs').insert(mapSecurityLogToDb(log));
      if (error) console.error('Error inserting log into Supabase:', error.message);
      return;
    }

    this.data.securityLogs.unshift(log);
    
    if (this.data.securityLogs.length > 500) {
      this.data.securityLogs = this.data.securityLogs.slice(0, 500);
    }
    this.save();
  }

  public async getApiSecret(): Promise<string> {
    if (this.usingSupabase) {
      const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'api_secret').maybeSingle();
      if (!error && data) {
        return data.value;
      }
    }
    return this.data.apiSecret;
  }

  public async resetApiSecret(): Promise<string> {
    const newSecret = 'gam_sec_' + crypto.randomBytes(16).toString('hex');
    this.data.apiSecret = newSecret;

    if (this.usingSupabase) {
      await supabase.from('system_settings').upsert({ key: 'api_secret', value: newSecret });
      await this.addSecurityLog(
        'SECRET_ROTATED',
        'system',
        'warning',
        'API secret rotated. Old signatures are now invalid.'
      );
      return newSecret;
    }

    await this.addSecurityLog(
      'SECRET_ROTATED',
      'system',
      'warning',
      'API secret rotated. Old signatures are now invalid.'
    );
    this.save();
    return newSecret;
  }

  public async getSystemStatus(): Promise<SystemStatus> {
    const apiSecret = await this.getApiSecret();
    if (this.usingSupabase) {
      const [usersRes, transactionsRes] = await Promise.all([
        supabase.from('users').select('id'),
        supabase.from('transactions').select('amount')
      ]);
      const dbUsers = usersRes.data || [];
      const dbTxs = transactionsRes.data || [];
      
      const totalTransactions = dbTxs.length;
      const totalVolume = dbTxs.reduce((acc: number, t: any) => acc + Math.abs(t.amount), 0);
      const activeUsersCount = dbUsers.length;

      return {
        apiSecret,
        totalTransactions,
        totalVolume,
        activeUsersCount,
        usingSupabase: true
      };
    }

    const totalTransactions = this.data.transactions.length;
    const totalVolume = this.data.transactions.reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const activeUsersCount = Object.keys(this.data.users).length;

    return {
      apiSecret,
      totalTransactions,
      totalVolume,
      activeUsersCount,
      usingSupabase: false
    };
  }

  public async resetDatabase(): Promise<void> {
    if (this.usingSupabase) {
      await Promise.all([
        supabase.from('users').delete().neq('id', ''),
        supabase.from('transactions').delete().neq('id', ''),
        supabase.from('security_logs').delete().neq('id', ''),
        supabase.from('system_settings').delete().neq('key', '')
      ]);
      await this.seedSupabaseIfEmpty();
      return;
    }

    const defaultData = this.load();
    this.data = defaultData;
    this.save();
  }
}

export const db = new Database();
export default db;
