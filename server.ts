import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db';
import { TransactionType } from './src/types';

// Load environmental variables if present
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON body parsing
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  // Skip standard asset logs, only log API requests
  if (req.url.startsWith('/api/')) {
    console.log(`[API Request] ${req.method} ${req.url} - IP: ${ip}`);
  }
  next();
});

// Helper to get client IP
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0]).trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
};

// ==========================================
// SECURITY MIDDLEWARE: HMAC-SHA256 Verification
// ==========================================
const verifyHmacSignature = async (req: Request, res: Response, next: NextFunction) => {
  const isSecureMode = req.headers['x-secure-mode'] === 'true';
  const ip = getClientIp(req);

  // If secure mode is disabled for demo, skip verification
  if (!isSecureMode) {
    return next();
  }

  const signature = req.headers['x-signature'] as string;
  const timestampHeader = req.headers['x-timestamp'] as string;

  if (!signature) {
    await db.addSecurityLog(
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      ip,
      'error',
      `Blocked transaction request: Missing 'x-signature' header.`
    );
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing cryptographic signature in headers.',
    });
  }

  if (!timestampHeader) {
    await db.addSecurityLog(
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      ip,
      'error',
      `Blocked transaction request: Missing 'x-timestamp' header.`
    );
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing timestamp header for security.',
    });
  }

  // Prevent replay attacks (allow up to 5 minutes tolerance)
  const requestTime = parseInt(timestampHeader, 10);
  const currentTime = Date.now();
  const timeToleranceMs = 5 * 60 * 1000; // 5 mins

  if (isNaN(requestTime) || Math.abs(currentTime - requestTime) > timeToleranceMs) {
    await db.addSecurityLog(
      'REPLAY_ATTACK_SUSPECTED',
      ip,
      'warning',
      `Blocked transaction request: Timestamp out of bounds. Request timestamp: ${requestTime}, Server time: ${currentTime}`
    );
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Timestamp validation failed (replay attack guard). Ensure your system clock is accurate.',
    });
  }

  // Verify HMAC signature
  try {
    const rawBody = JSON.stringify(req.body);
    const apiSecret = await db.getApiSecret();
    
    // Construct message to sign: "timestamp:body_json"
    const message = `${timestampHeader}:${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', apiSecret)
      .update(message)
      .digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      return next();
    } else {
      throw new Error('Signature mismatch');
    }
  } catch (error) {
    await db.addSecurityLog(
      'INVALID_SIGNATURE',
      ip,
      'error',
      `Blocked transaction request: Invalid payload signature verification failed.`
    );
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Cryptographic signature mismatch. Your payload has been altered or secret key is invalid.',
    });
  }
};

// ==========================================
// WALLET & TRANSACTION ENDPOINTS
// ==========================================

// 1. Health check & basic system status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    timestamp: Date.now()
  });
});

// 2. Fetch System Configuration & Status metrics
app.get('/api/system/status', async (req: Request, res: Response) => {
  const status = await db.getSystemStatus();
  res.json({ success: true, ...status });
});

// 3. Rotate Shared API Secret Key
app.post('/api/system/rotate-secret', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const newSecret = await db.resetApiSecret();
  res.json({
    success: true,
    message: 'API Shared Secret rotated successfully. All subsequent requests must use this new secret.',
    apiSecret: newSecret
  });
});

// 4. Reset the database to factory settings
app.post('/api/system/reset', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  await db.resetDatabase();
  await db.addSecurityLog('DATABASE_RESET', ip, 'warning', 'Database completely reset to initial parameters by user action.');
  res.json({
    success: true,
    message: 'Database reset successfully.'
  });
});

// 5. List all active users
app.get('/api/users', async (req: Request, res: Response) => {
  const users = await db.getUsers();
  res.json({ success: true, users });
});

// 6. Create a new user wallet
app.post('/api/users/create', async (req: Request, res: Response) => {
  const { userId, username, initialBalance } = req.body;
  const ip = getClientIp(req);

  if (!userId || !username) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: userId and username.'
    });
  }

  // Regex check for safety
  const cleanIdPattern = /^[a-zA-Z0-9_\-]+$/;
  if (!cleanIdPattern.test(userId)) {
    await db.addSecurityLog('INPUT_VALIDATION_FAILED', ip, 'warning', `Invalid format for user ID: "${userId}"`);
    return res.status(400).json({
      success: false,
      error: 'Invalid user ID format. Only alphanumeric characters, hyphens, and underscores are allowed.'
    });
  }

  try {
    const newUser = await db.createUser(userId, username, typeof initialBalance === 'number' ? initialBalance : 1000.00);
    res.json({ success: true, user: newUser });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 7. Get balance of specific user wallet
app.get('/api/user/:userId/balance', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = await db.getUser(userId);

  if (!user) {
    return res.status(404).json({ success: false, error: `User with ID ${userId} not found.` });
  }

  res.json({
    success: true,
    userId,
    username: user.username,
    balance: user.balance,
    lastActive: user.lastActive
  });
});

// 8. Securely record and process transactions (Deposit, Withdraw, Bet, Win)
app.post('/api/wallet/transaction', verifyHmacSignature, async (req: Request, res: Response) => {
  const { userId, type, amount, gameId, notes } = req.body;
  const ip = getClientIp(req);
  const isSecureMode = req.headers['x-secure-mode'] === 'true';

  // Strict Payload validation
  if (!userId || !type || typeof amount !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'Invalid payload structure. Requires: userId, type, and amount.'
    });
  }

  if (amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Transaction amount must be a positive number.'
    });
  }

  const validTypes: TransactionType[] = ['deposit', 'withdraw', 'bet', 'win'];
  if (!validTypes.includes(type as TransactionType)) {
    return res.status(400).json({
      success: false,
      error: `Invalid transaction type. Allowed values: ${validTypes.join(', ')}`
    });
  }

  const user = await db.getUser(userId);
  if (!user) {
    await db.addSecurityLog(
      'TRANSACTION_FAILED',
      ip,
      'warning',
      `Transaction attempt on non-existent user wallet: ${userId}`
    );
    return res.status(404).json({
      success: false,
      error: `User wallet with ID "${userId}" does not exist.`
    });
  }

  try {
    // Determine balance change (withdrawal and bets decrease balance, deposits and wins increase balance)
    let balanceDelta = amount;
    if (type === 'withdraw' || type === 'bet') {
      balanceDelta = -amount;
    }

    // Attempt to update balance (handles negative balance checks)
    const { prevBalance } = await db.updateUserBalance(userId, balanceDelta, ip);
    const updatedUser = await db.getUser(userId);
    const newBalance = updatedUser ? updatedUser.balance : prevBalance;

    // Record the transaction securely
    const incomingSignature = req.headers['x-signature'] as string || 'bypass-demo';
    const tx = await db.addTransaction({
      userId,
      type: type as TransactionType,
      amount,
      previousBalance: prevBalance,
      newBalance,
      gameId,
      signature: isSecureMode ? incomingSignature : undefined,
      status: 'success',
      ipAddress: ip,
      notes: notes || `Recorded via ${isSecureMode ? 'HMAC Secure Channel' : 'Bypass Demo Mode'}`
    }, ip);

    // Log the security event
    await db.addSecurityLog(
      'TRANSACTION_APPROVED',
      ip,
      'success',
      `Processed ${type} of ${amount} for ${userId}. New balance: ${newBalance}. TxHash: ${tx.hash.substring(0, 10)}...`
    );

    res.json({
      success: true,
      message: 'Transaction successfully processed and securely recorded.',
      transaction: tx
    });

  } catch (error: any) {
    // If balance update failed (e.g., insufficient funds)
    await db.addSecurityLog(
      'TRANSACTION_DENIED',
      ip,
      'warning',
      `Declined ${type} of ${amount} for ${userId} due to: ${error.message}`
    );

    // Record a failed transaction log too for accounting
    const failedTx = await db.addTransaction({
      userId,
      type: type as TransactionType,
      amount,
      previousBalance: user.balance,
      newBalance: user.balance,
      gameId,
      signature: isSecureMode ? (req.headers['x-signature'] as string) : undefined,
      status: 'failed',
      ipAddress: ip,
      notes: `Failed: ${error.message}`
    }, ip);

    res.status(400).json({
      success: false,
      error: error.message,
      transaction: failedTx
    });
  }
});

// 9. Fetch transaction records
app.get('/api/transactions', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const transactions = await db.getTransactions(userId);
  res.json({ success: true, transactions });
});

// 10. Fetch security audit logs
app.get('/api/logs', async (req: Request, res: Response) => {
  const logs = await db.getSecurityLogs();
  res.json({ success: true, logs });
});

// 11. Helper to generate valid signatures for developer integration testing
app.post('/api/test/generate-signature', async (req: Request, res: Response) => {
  const { payload, timestamp } = req.body;

  if (!payload || !timestamp) {
    return res.status(400).json({
      success: false,
      error: 'Missing body payload or timestamp.'
    });
  }

  try {
    const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const apiSecret = await db.getApiSecret();
    const message = `${timestamp}:${rawBody}`;
    
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(message)
      .digest('hex');

    res.json({
      success: true,
      timestamp,
      payload: typeof payload === 'string' ? JSON.parse(payload) : payload,
      signature,
      signature_header: signature,
      timestamp_header: timestamp.toString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. Manual transaction request (pending state)
app.post('/api/wallet/manual-request', async (req: Request, res: Response) => {
  const { userId, type, amount, notes } = req.body;
  const ip = getClientIp(req);

  if (!userId || !type || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid parameters. Requires userId, type, positive amount.' });
  }

  if (type !== 'deposit' && type !== 'withdraw') {
    return res.status(400).json({ success: false, error: 'Manual requests can only be deposit or withdraw types.' });
  }

  const user = await db.getUser(userId);
  if (!user) {
    return res.status(404).json({ success: false, error: `User ID ${userId} not found.` });
  }

  try {
    const tx = await db.addTransaction({
      userId,
      type: type as TransactionType,
      amount,
      previousBalance: user.balance,
      newBalance: user.balance, // unchanged until approved
      status: 'pending',
      ipAddress: ip,
      notes: notes || `Manual ${type} request submitted`
    }, ip);

    await db.addSecurityLog(
      'MANUAL_TRANSACTION_SUBMITTED',
      ip,
      'warning',
      `Manual ${type} request submitted of $${amount} for user "${user.username}"`
    );

    res.json({ success: true, transaction: tx });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. Approve manual pending transaction
app.post('/api/wallet/approve', async (req: Request, res: Response) => {
  const { transactionId } = req.body;
  const ip = getClientIp(req);

  if (!transactionId) {
    return res.status(400).json({ success: false, error: 'Missing transactionId parameter.' });
  }

  try {
    const tx = await db.approveTransaction(transactionId, ip);
    res.json({ success: true, transaction: tx, message: 'Transaction successfully approved and balance updated.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 14. Reject manual pending transaction
app.post('/api/wallet/reject', async (req: Request, res: Response) => {
  const { transactionId } = req.body;
  const ip = getClientIp(req);

  if (!transactionId) {
    return res.status(400).json({ success: false, error: 'Missing transactionId parameter.' });
  }

  try {
    const tx = await db.rejectTransaction(transactionId, ip);
    res.json({ success: true, transaction: tx, message: 'Transaction successfully rejected.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 15. Update user profile details & status
app.post('/api/users/update-profile', async (req: Request, res: Response) => {
  const { userId, email, phoneNumber, country, status, riskScore } = req.body;
  const ip = getClientIp(req);

  if (!userId) {
    return res.status(400).json({ success: false, error: 'Missing userId parameter.' });
  }

  try {
    const updatedUser = await db.updateUserProfile(userId, {
      email,
      phoneNumber,
      country,
      status,
      riskScore
    }, ip);

    res.json({ success: true, user: updatedUser, message: 'User profile successfully updated.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});


// ==========================================
// VITE INTEGRATION FOR FRONTEND DASHBOARD
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
