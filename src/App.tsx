import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Shield, 
  RefreshCw, 
  Database, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Coins, 
  Activity, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  UserPlus, 
  AlertTriangle, 
  Code, 
  Server, 
  Play, 
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  XCircle,
  CheckCircle2,
  Users,
  Eye,
  Edit2,
  Globe,
  Mail,
  Phone,
  AlertOctagon,
  CheckSquare,
  XSquare,
  Search,
  Filter,
  X
} from 'lucide-react';
import { User, Transaction, SecurityLog, SystemStatus, TransactionType } from './types';

export default function App() {
  // State for loaded data
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [logs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Active tab selection
  const [activeTab, setActiveTab] = useState<'playground' | 'players' | 'approvals' | 'ledger' | 'security' | 'code'>('playground');

  // Search/filter states for tables
  const [playerSearch, setPlayerSearch] = useState('');
  const [ledgerFilter, setLedgerFilter] = useState<string>('all');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Selected player detail modal/drawer
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null);
  
  // Edit player profile states
  const [editingPlayer, setEditingPlayer] = useState<User | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');
  const [editRiskScore, setEditRiskScore] = useState<'low' | 'medium' | 'high'>('low');

  // Interactive transaction creation
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newUserId, setNewUserId] = useState<string>('');
  const [newUsername, setNewUsername] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPhone, setNewUserPhone] = useState<string>('');
  const [newUserCountry, setNewUserCountry] = useState<string>('India');
  const [newUserBalance, setNewUserBalance] = useState<number>(1000);

  // Transaction form state
  const [txType, setTxType] = useState<TransactionType>('bet');
  const [txAmount, setTxAmount] = useState<string>('100');
  const [txGameId, setTxGameId] = useState<string>('blackjack_table_1');
  const [txNotes, setTxNotes] = useState<string>('');
  const [useSecureMode, setUseSecureMode] = useState<boolean>(true);
  const [tamperPayload, setTamperPayload] = useState<boolean>(false);
  const [isManualApprovalTx, setIsManualApprovalTx] = useState<boolean>(false);

  // Visual developer trace states
  const [lastExecutedRequest, setLastExecutedRequest] = useState<any>(null);
  const [lastExecutedResponse, setLastExecutedResponse] = useState<any>(null);

  // Feedbacks
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Fetch all live dashboard data
  const fetchAllData = async () => {
    try {
      const [usersRes, txRes, logsRes, statusRes] = await Promise.all([
        fetch('/api/users').then(res => res.json()),
        fetch('/api/transactions').then(res => res.json()),
        fetch('/api/logs').then(res => res.json()),
        fetch('/api/system/status').then(res => res.json()),
      ]);

      if (usersRes.success) setUsers(usersRes.users);
      if (txRes.success) setTransactions(txRes.transactions);
      if (logsRes.success) setSecurityLogs(logsRes.logs);
      if (statusRes.success) {
        setSystemStatus({
          apiSecret: statusRes.apiSecret,
          totalTransactions: statusRes.totalTransactions,
          totalVolume: statusRes.totalVolume,
          activeUsersCount: statusRes.activeUsersCount,
        });

        // Set default selected user if not initialized
        if (!selectedUserId && usersRes.users.length > 0) {
          setSelectedUserId(usersRes.users[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load API data:', err);
      showError('Unable to connect to the backend server. Reconnecting...');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 3000);
    return () => clearInterval(interval);
  }, [selectedUserId]);

  // Toast Helpers
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4500);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 1800);
  };

  // Create user wallet
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId || !newUsername) {
      showError('Please enter a User ID and Nickname.');
      return;
    }

    try {
      const formattedUserId = newUserId.toLowerCase().replace(/\s+/g, '_');
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: formattedUserId,
          username: newUsername,
          initialBalance: Number(newUserBalance)
        })
      });

      const data = await response.json();
      if (data.success) {
        // Also update registration details immediately
        await fetch('/api/users/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: formattedUserId,
            email: newUserEmail || `${formattedUserId}@gamblingmail.com`,
            phoneNumber: newUserPhone || '+91 90000 12345',
            country: newUserCountry || 'India',
            status: 'active',
            riskScore: 'low'
          })
        });

        showSuccess(`Player account "${newUsername}" created successfully!`);
        setNewUserId('');
        setNewUsername('');
        setNewUserEmail('');
        setNewUserPhone('');
        setNewUserCountry('India');
        setNewUserBalance(1000);
        setSelectedUserId(formattedUserId);
        fetchAllData();
      } else {
        showError(data.error || 'Failed to create user wallet.');
      }
    } catch (err) {
      showError('Network error while creating account.');
    }
  };

  // Update User Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;

    try {
      const response = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingPlayer.id,
          email: editEmail,
          phoneNumber: editPhone,
          country: editCountry,
          status: editStatus,
          riskScore: editRiskScore
        })
      });

      const data = await response.json();
      if (data.success) {
        showSuccess(`Account details for player "${editingPlayer.username}" updated!`);
        setEditingPlayer(null);
        fetchAllData();
      } else {
        showError(data.error || 'Failed to update player account.');
      }
    } catch (err) {
      showError('Network error updating player account.');
    }
  };

  // Set edit form values
  const startEditing = (user: User) => {
    setEditingPlayer(user);
    setEditEmail(user.email || '');
    setEditPhone(user.phoneNumber || '');
    setEditCountry(user.country || 'India');
    setEditStatus(user.status || 'active');
    setEditRiskScore(user.riskScore || 'low');
  };

  // Toggle suspension status fast
  const toggleSuspensionFast = async (user: User) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          status: nextStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`Player "${user.username}" is now ${nextStatus === 'suspended' ? 'SUSPENDED' : 'ACTIVATED'}`);
        fetchAllData();
      } else {
        showError(data.error);
      }
    } catch (e) {
      showError('Error toggling suspension status.');
    }
  };

  // Submit Transaction (Instant vs Manual Pending)
  const handleProcessTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      showError('Please select or create a user wallet first.');
      return;
    }

    const amountNum = Number(txAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showError('Transaction amount must be a positive number.');
      return;
    }

    const player = users.find(u => u.id === selectedUserId);
    if (player?.status === 'suspended') {
      showError(`Transaction Denied. Account of player "${player.username}" is suspended!`);
      return;
    }

    // Determine endpoint based on whether this is a manual-approval test
    const isManualEndpoint = isManualApprovalTx && (txType === 'deposit' || txType === 'withdraw');
    const endpoint = isManualEndpoint ? '/api/wallet/manual-request' : '/api/wallet/transaction';

    try {
      const timestamp = Date.now();
      const payload: any = {
        userId: selectedUserId,
        type: txType,
        amount: amountNum,
        gameId: isManualEndpoint ? undefined : (txGameId || undefined),
        notes: txNotes || `${isManualEndpoint ? 'Manual Request' : 'API Game Outcome'}: ${txType}`
      };

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const finalPayloadString = JSON.stringify(payload);

      if (!isManualEndpoint && useSecureMode) {
        headers['x-secure-mode'] = 'true';
        headers['x-timestamp'] = timestamp.toString();

        let bodyToSign = finalPayloadString;
        if (tamperPayload) {
          bodyToSign = JSON.stringify({ ...payload, amount: amountNum * 8 }); // Alter wager amount on fly
        }

        const sigResponse = await fetch('/api/test/generate-signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: JSON.parse(bodyToSign), timestamp })
        });
        const sigData = await sigResponse.json();
        if (sigData.success) {
          headers['x-signature'] = sigData.signature;
        }
      } else if (!isManualEndpoint) {
        headers['x-secure-mode'] = 'false';
      }

      // Record logs for visual developer debugging trace
      setLastExecutedRequest({
        url: endpoint,
        method: 'POST',
        headers,
        body: JSON.parse(finalPayloadString),
        tampered: tamperPayload && !isManualEndpoint
      });

      const txResponse = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: finalPayloadString
      });

      const txResult = await txResponse.json();
      setLastExecutedResponse({
        status: txResponse.status,
        statusText: txResponse.statusText,
        body: txResult
      });

      if (txResult.success) {
        if (isManualEndpoint) {
          showSuccess(`Manual ${txType} request submitted as PENDING! Approve it in the Approvals Tab.`);
          setActiveTab('approvals');
        } else {
          showSuccess(`Instant Transaction processed! Hash: ${txResult.transaction.hash.substring(0, 10)}...`);
        }
        setTxNotes('');
        fetchAllData();
      } else {
        showError(txResult.error || 'Transaction rejected by Gateway.');
        fetchAllData();
      }
    } catch (err) {
      showError('Failed to establish server connection.');
    }
  };

  // Approve manual transaction request
  const handleApproveTransaction = async (txId: string) => {
    try {
      const response = await fetch('/api/wallet/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId })
      });
      const data = await response.json();
      if (data.success) {
        showSuccess('Transaction approved and balance processed!');
        fetchAllData();
      } else {
        showError(data.error || 'Approval failed.');
      }
    } catch (e) {
      showError('Network error while processing approval.');
    }
  };

  // Reject manual transaction request
  const handleRejectTransaction = async (txId: string) => {
    try {
      const response = await fetch('/api/wallet/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId })
      });
      const data = await response.json();
      if (data.success) {
        showSuccess('Transaction rejected. Balance untouched.');
        fetchAllData();
      } else {
        showError(data.error || 'Rejection failed.');
      }
    } catch (e) {
      showError('Network error while processing rejection.');
    }
  };

  const handleRotateSecret = async () => {
    if (!confirm('Are you sure you want to rotate the system secret? This will invalidate all active developer integration signatures.')) return;
    try {
      const res = await fetch('/api/system/rotate-secret', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showSuccess('System API Shared Secret rotated successfully!');
        fetchAllData();
      }
    } catch (e) {
      showError('Failed to rotate API secret.');
    }
  };

  const handleResetDb = async () => {
    if (!confirm('This will wipe out all user transactions and reset wallets to initial test limits. Proceed?')) return;
    try {
      const res = await fetch('/api/system/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showSuccess('Database fully reset to system defaults.');
        setSelectedUserId('demo_user_1');
        fetchAllData();
      }
    } catch (e) {
      showError('Failed to reset database.');
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);
  const pendingTransactions = transactions.filter(t => t.status === 'pending');

  // Filtered Players list
  const filteredPlayers = users.filter(user => 
    user.username.toLowerCase().includes(playerSearch.toLowerCase()) ||
    user.id.toLowerCase().includes(playerSearch.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(playerSearch.toLowerCase()))
  );

  // Filtered Ledger list
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.id.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      tx.userId.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      (tx.notes && tx.notes.toLowerCase().includes(ledgerSearch.toLowerCase()));
    
    if (ledgerFilter === 'all') return matchesSearch;
    return matchesSearch && tx.type === ledgerFilter;
  });

  // Code integration string
  const nodeIntegrationCode = `/**
 * SECURE WALLET GATEWAY - BACKEND INTEGRATION CODE
 * Implement this on your Node.js game server to communicate with this wallet service.
 */
import crypto from 'crypto';

const GATEWAY_URL = "${window.location.origin}";
const API_SECRET = "${systemStatus?.apiSecret || 'YOUR_API_SHARED_SECRET'}";

/**
 * Send a secure, cryptographically-signed transaction request to the Wallet API.
 * This prevents players from injecting fake wins or manipulating wagers.
 */
async function sendSignedTransaction(userId, type, amount, gameId = 'blackjack_table_1') {
  const timestamp = Date.now().toString();
  
  const payload = {
    userId,
    type,       // 'bet', 'win', 'deposit', 'withdraw'
    amount,     // Positive number
    gameId,
    notes: \`Game wager outcome processed by \${gameId}\`
  };

  const rawBody = JSON.stringify(payload);
  
  // Construct signature payload: "timestamp:JSON_payload"
  const message = \`\${timestamp}:\${rawBody}\`;
  
  // Sign using HMAC-SHA256 with the secret
  const signature = crypto
    .createHmac('sha256', API_SECRET)
    .update(message)
    .digest('hex');

  try {
    const response = await fetch(\`\${GATEWAY_URL}/api/wallet/transaction\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secure-mode': 'true',
        'x-signature': signature,
        'x-timestamp': timestamp
      },
      body: rawBody
    });

    const result = await response.json();
    if (result.success) {
      console.log('✅ Transaction processed. Hash:', result.transaction.hash);
      return result.transaction;
    } else {
      console.error('❌ Transaction rejected:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Network transaction failed:', error.message);
  }
}
`;

  return (
    <div id="secure_api_app" className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-12">
      
      {/* Toast Alert Panels */}
      {successMessage && (
        <div id="toast_success" className="fixed top-4 right-4 z-50 bg-emerald-950 border border-emerald-500/80 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div id="toast_error" className="fixed top-4 right-4 z-50 bg-rose-950 border border-rose-500/80 text-rose-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="text-sm font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <header id="app_header" className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/15 rounded-xl border border-indigo-500/30 text-indigo-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-md font-bold tracking-tight text-white font-mono">GAMSECURE ADMINISTRATIVE HUBS</h1>
                <span className="px-1.5 py-0.5 text-[9px] uppercase font-mono tracking-wider font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">Safe Audit</span>
              </div>
              <p className="text-[11px] text-slate-400">Real-Time Player Wallets, Manual Approvals & Cryptographic Ledger</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>GATEWAY ONLINE: 3000</span>
            </div>
            <button 
              id="btn_reset_db"
              onClick={handleResetDb}
              title="Reset sandbox to original default stats"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded-lg transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* System Overview Dashboard Metrics */}
        <section id="metrics_dashboard" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          
          {/* Active Wallets Card */}
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Player Profiles</span>
              <span className="text-xl font-bold tracking-tight font-mono text-white">
                {users.length}
              </span>
              <span className="text-[10px] text-slate-500 block">Sign-up detail audits available</span>
            </div>
            <div className="p-2.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Pending Approvals Card */}
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Pending Approvals</span>
              <span className="text-xl font-bold tracking-tight font-mono text-amber-400">
                {pendingTransactions.length}
              </span>
              <span className="text-[10px] text-slate-500 block">Manual requests requiring attention</span>
            </div>
            <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Combined Transactions Card */}
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Ledger Entries</span>
              <span className="text-xl font-bold tracking-tight font-mono text-white">
                {transactions.length}
              </span>
              <span className="text-[10px] text-slate-500 block">Complete bet & outcome hashes</span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          {/* Turnover Volume Card */}
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Total Audit Volume</span>
              <span className="text-xl font-bold tracking-tight font-mono text-white">
                ${systemStatus?.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </span>
              <span className="text-[10px] text-slate-500 block">Total turnover processed</span>
            </div>
            <div className="p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
              <Coins className="w-5 h-5" />
            </div>
          </div>

        </section>

        {/* Interactive Tabs */}
        <div id="dashboard_tabs" className="flex border-b border-slate-900 mb-6 overflow-x-auto scrollbar-none gap-1.5">
          <button
            id="tab_playground"
            onClick={() => setActiveTab('playground')}
            className={`px-4 py-2 font-medium text-xs border-b-2 transition-all shrink-0 ${
              activeTab === 'playground'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" /> Sandbox Playground
            </span>
          </button>
          
          <button
            id="tab_players"
            onClick={() => setActiveTab('players')}
            className={`px-4 py-2 font-medium text-xs border-b-2 transition-all shrink-0 ${
              activeTab === 'players'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Players & Sign-up Details ({users.length})
            </span>
          </button>

          <button
            id="tab_approvals"
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 font-medium text-xs border-b-2 transition-all shrink-0 relative ${
              activeTab === 'approvals'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-amber-500" /> Pending Approvals
              {pendingTransactions.length > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                  {pendingTransactions.length}
                </span>
              )}
            </span>
          </button>

          <button
            id="tab_ledger"
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 font-medium text-xs border-b-2 transition-all shrink-0 ${
              activeTab === 'ledger'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" /> Transaction Ledger
            </span>
          </button>

          <button
            id="tab_security"
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 font-medium text-xs border-b-2 transition-all shrink-0 ${
              activeTab === 'security'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Security Logs
            </span>
          </button>

          <button
            id="tab_code"
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 font-medium text-xs border-b-2 transition-all shrink-0 ${
              activeTab === 'code'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5" /> Integration Code
            </span>
          </button>
        </div>

        {/* Tab Contents: Playground */}
        {activeTab === 'playground' && (
          <div id="playground_panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Wallet & Sandbox processing */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Target User select or fast-creation */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5">
                <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-indigo-400" />
                  Step 1: Choose or Create Player Account
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-medium">Active Player Wallet</label>
                    <select
                      id="select_user"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono"
                    >
                      <option value="">-- Select Active Player --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.username} (${u.balance.toFixed(2)}) {u.status === 'suspended' ? '[Suspended]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedUser && (
                    <div className="bg-slate-950 border border-slate-800/60 rounded-lg p-2.5 flex items-center justify-between text-xs font-mono text-slate-400">
                      <div>
                        <span className="block text-slate-500 text-[9px]">WALLET VALUE</span>
                        <strong className="text-emerald-400 text-sm font-bold">${selectedUser.balance.toFixed(2)}</strong>
                      </div>
                      <div className="text-right">
                        <span className="block text-slate-500 text-[9px]">PLAYER ID</span>
                        <span className="text-slate-300 font-semibold">{selectedUser.id}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Account register form */}
                <div className="mt-5 pt-4 border-t border-slate-900">
                  <span className="text-[11px] font-semibold text-slate-300 block mb-2.5">Register a new player wallet:</span>
                  <form onSubmit={handleCreateUser} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] text-slate-500 mb-0.5">Player ID (alphanumeric)</label>
                        <input
                          id="input_userid"
                          type="text"
                          required
                          placeholder="player_jack_77"
                          value={newUserId}
                          onChange={(e) => setNewUserId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 mb-0.5">Nickname / Name</label>
                        <input
                          id="input_username"
                          type="text"
                          required
                          placeholder="Jack Sparrow"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] text-slate-500 mb-0.5">Email Address</label>
                        <input
                          type="email"
                          placeholder="jack@caribbean.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 mb-0.5">Phone Number</label>
                        <input
                          type="text"
                          placeholder="+91 99881 23456"
                          value={newUserPhone}
                          onChange={(e) => setNewUserPhone(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 mb-0.5">Initial Balance ($)</label>
                        <input
                          type="number"
                          value={newUserBalance}
                          onChange={(e) => setNewUserBalance(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-1.5 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        id="btn_create_wallet"
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-1.5 px-4 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Register Wallet
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Transaction Simulator */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5">
                <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  Step 2: Process Real-Time Transaction Or Request
                </h3>

                <form onSubmit={handleProcessTransaction} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1.5 font-medium">Select Transaction Scheme</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        id="tx_btn_bet"
                        type="button"
                        onClick={() => { setTxType('bet'); setIsManualApprovalTx(false); }}
                        className={`py-2 px-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          txType === 'bet' && !isManualApprovalTx
                            ? 'bg-amber-950/40 border-amber-500 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <ArrowDownLeft className="w-3 h-3 text-amber-500" /> Bet (Debit)
                        </span>
                      </button>
                      <button
                        id="tx_btn_win"
                        type="button"
                        onClick={() => { setTxType('win'); setIsManualApprovalTx(false); }}
                        className={`py-2 px-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          txType === 'win' && !isManualApprovalTx
                            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <ArrowUpRight className="w-3 h-3 text-emerald-500" /> Win (Credit)
                        </span>
                      </button>
                      <button
                        id="tx_btn_deposit"
                        type="button"
                        onClick={() => setTxType('deposit')}
                        className={`py-2 px-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          txType === 'deposit'
                            ? 'bg-blue-950/40 border-blue-500 text-blue-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <ArrowUpRight className="w-3 h-3 text-blue-500" /> Deposit
                        </span>
                      </button>
                      <button
                        id="tx_btn_withdraw"
                        type="button"
                        onClick={() => setTxType('withdraw')}
                        className={`py-2 px-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          txType === 'withdraw'
                            ? 'bg-rose-950/40 border-rose-500 text-rose-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <ArrowDownLeft className="w-3 h-3 text-rose-500" /> Withdraw
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-medium">Amount ($)</label>
                      <input
                        id="input_tx_amount"
                        type="number"
                        step="0.01"
                        placeholder="100.00"
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-xs px-3.5 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100 font-mono"
                      />
                    </div>

                    {(txType === 'deposit' || txType === 'withdraw') ? (
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 font-medium">Processing Protocol</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setIsManualApprovalTx(false)}
                            className={`py-2 px-1 text-[11px] font-semibold border rounded-lg transition-all ${
                              !isManualApprovalTx
                                ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300'
                                : 'bg-slate-950 border-slate-800 text-slate-500'
                            }`}
                          >
                            Instant Autopay
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsManualApprovalTx(true)}
                            className={`py-2 px-1 text-[11px] font-semibold border rounded-lg transition-all ${
                              isManualApprovalTx
                                ? 'bg-amber-950/40 border-amber-500 text-amber-300 animate-pulse'
                                : 'bg-slate-950 border-slate-800 text-slate-500'
                            }`}
                          >
                            Admin Manual Approval
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 font-medium">Game Identification</label>
                        <input
                          id="input_tx_game"
                          type="text"
                          placeholder="blackjack_table_1"
                          value={txGameId}
                          onChange={(e) => setTxGameId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100 font-mono"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-medium">Comment / Notes (Visible to Auditor)</label>
                    <input
                      id="input_tx_notes"
                      type="text"
                      placeholder="e.g. Bank wire ref #99281, Blackjack high stakes payout"
                      value={txNotes}
                      onChange={(e) => setTxNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                    />
                  </div>

                  {/* HMAC signature options when not doing manual flow */}
                  {!isManualApprovalTx && (
                    <div className="bg-slate-950 border border-slate-900 rounded-lg p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {useSecureMode ? (
                            <Lock className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                          )}
                          <div>
                            <span className="text-[11px] font-semibold text-white block">HMAC-SHA256 Cryptographic Verification</span>
                            <span className="text-[9px] text-slate-500 block">Server validates payload headers against the Shared Secret.</span>
                          </div>
                        </div>
                        <button
                          id="btn_toggle_security"
                          type="button"
                          onClick={() => {
                            setUseSecureMode(!useSecureMode);
                            if (useSecureMode) setTamperPayload(false);
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all ${
                            useSecureMode 
                              ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300' 
                              : 'bg-amber-950/20 border-amber-800/40 text-amber-400'
                          }`}
                        >
                          {useSecureMode ? 'SECURE ON' : 'BYPASS DEMO'}
                        </button>
                      </div>

                      {useSecureMode && (
                        <div className="border-t border-slate-900 pt-2 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-medium text-slate-300 block">Simulate Bad-Actor Payload Tampering (Attack)</span>
                            <span className="text-[9px] text-slate-500 block">Modifies the bet amount in transit to spoof the balance gateway.</span>
                          </div>
                          <button
                            id="btn_toggle_tamper"
                            type="button"
                            onClick={() => setTamperPayload(!tamperPayload)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all ${
                              tamperPayload 
                                ? 'bg-rose-950 border-rose-500 text-rose-200' 
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            {tamperPayload ? '⚠️ ACTIVE ATTACK' : 'NORMAL PAYLOAD'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    id="btn_submit_transaction"
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-4 rounded-lg transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Coins className="w-4 h-4" />
                    {isManualApprovalTx ? 'Submit for Admin Approval (PENDING)' : 'Process Instant Autopay & Record'}
                  </button>

                </form>
              </div>

            </div>

            {/* Right Column: Console Visualizer */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 flex flex-col h-full justify-between min-h-[400px]">
                <div>
                  <h3 className="text-xs font-semibold text-white mb-1.5 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    Security Gateway Audit Inspector
                  </h3>
                  <p className="text-[10px] text-slate-400 mb-3">Observe live network headers, timestamp verification, and digital signature logs.</p>
                </div>

                {lastExecutedRequest ? (
                  <div className="space-y-3.5 flex-1 mt-2">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Outgoing Request Headers</span>
                        {lastExecutedRequest.tampered && (
                          <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-800/40 font-mono px-1 rounded animate-pulse">Spoof Attack Detected</span>
                        )}
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[11px] font-mono text-slate-300 overflow-x-auto space-y-1">
                        <div><span className="text-indigo-400">POST</span> {lastExecutedRequest.url}</div>
                        <div className="text-slate-500 text-[9px] mt-1 border-t border-slate-900 pt-1 space-y-0.5">
                          <div>Content-Type: application/json</div>
                          {lastExecutedRequest.headers['x-secure-mode'] && <div>x-secure-mode: {lastExecutedRequest.headers['x-secure-mode']}</div>}
                          {lastExecutedRequest.headers['x-timestamp'] && <div>x-timestamp: {lastExecutedRequest.headers['x-timestamp']}</div>}
                          {lastExecutedRequest.headers['x-signature'] && <div className="text-indigo-300 truncate">x-signature: {lastExecutedRequest.headers['x-signature']}</div>}
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider font-mono block mb-1">Body Payload JSON</span>
                      <pre className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[10px] font-mono text-emerald-400 overflow-x-auto">
                        {JSON.stringify(lastExecutedRequest.body, null, 2)}
                      </pre>
                    </div>

                    {lastExecutedResponse && (
                      <div>
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider font-mono block mb-1">Gateway Endpoint Response</span>
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[10px] font-mono overflow-x-auto space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">HTTP Status:</span>
                            <span className={`font-bold ${lastExecutedResponse.status === 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {lastExecutedResponse.status} {lastExecutedResponse.statusText}
                            </span>
                          </div>
                          <div className="border-t border-slate-900 pt-1 text-slate-300 max-h-36 overflow-y-auto mt-1">
                            {JSON.stringify(lastExecutedResponse.body, null, 2)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-lg bg-slate-950/20">
                    <Shield className="w-8 h-8 text-slate-700 mb-2" />
                    <span className="text-xs font-semibold text-slate-400">Gateway Inspector Idle</span>
                    <span className="text-[10px] text-slate-500 max-w-xs mt-1">Submit sandbox transactions to trace HTTP packets and HMAC validation logs.</span>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* Tab Contents: Player Directory / Accounts */}
        {activeTab === 'players' && (
          <div id="players_panel" className="bg-slate-900/30 border border-slate-900 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Player Accounts & Sign-Up Profiles
                </h3>
                <p className="text-[11px] text-slate-400">Auditable sign-up details, phone verification numbers, countries, risk-scoring and balances.</p>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search user ID, nick, email..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className="bg-slate-950 text-xs text-slate-200 pl-8.5 pr-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-64"
                />
              </div>
            </div>

            {filteredPlayers.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg bg-slate-950/15">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <span className="text-xs text-slate-400">No players found matching your search.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-400 font-medium uppercase tracking-wider">
                      <th className="py-2 px-3 font-mono">Player ID</th>
                      <th className="py-2 px-3">Registration Time</th>
                      <th className="py-2 px-3">Nickname</th>
                      <th className="py-2 px-3">Contact Details</th>
                      <th className="py-2 px-3">Country</th>
                      <th className="py-2 px-3 text-right">Balance</th>
                      <th className="py-2 px-3 text-center">Risk Rating</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {filteredPlayers.map((user) => {
                      const regDate = new Date(user.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      let riskColor = 'text-green-400 bg-green-950/40 border-green-900';
                      if (user.riskScore === 'medium') riskColor = 'text-amber-400 bg-amber-950/40 border-amber-900';
                      if (user.riskScore === 'high') riskColor = 'text-rose-400 bg-rose-950/40 border-rose-900';

                      return (
                        <tr key={user.id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-3 font-mono font-bold text-white">{user.id}</td>
                          <td className="py-3 px-3 text-slate-400">{regDate}</td>
                          <td className="py-3 px-3 font-medium text-slate-200">{user.username}</td>
                          <td className="py-3 px-3 space-y-0.5">
                            <div className="flex items-center gap-1 text-[10px] text-slate-300">
                              <Mail className="w-2.5 h-2.5 text-indigo-400" />
                              <span>{user.email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Phone className="w-2.5 h-2.5 text-indigo-400" />
                              <span>{user.phoneNumber || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1 text-slate-300">
                              <Globe className="w-2.5 h-2.5 text-slate-500" />
                              <span>{user.country || 'India'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">${user.balance.toFixed(2)}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${riskColor}`}>
                              {user.riskScore || 'low'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {user.status === 'suspended' ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-400 bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-900">
                                Suspended
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-900">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedPlayer(user)}
                                title="View Bet & Transaction History"
                                className="p-1 text-indigo-400 hover:text-indigo-200 bg-slate-900 border border-slate-800 rounded transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => startEditing(user)}
                                title="Edit Player Profile"
                                className="p-1 text-blue-400 hover:text-blue-200 bg-slate-900 border border-slate-800 rounded transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => toggleSuspensionFast(user)}
                                title={user.status === 'suspended' ? 'Activate Player' : 'Suspend Player'}
                                className={`p-1 rounded transition-colors ${
                                  user.status === 'suspended'
                                    ? 'text-emerald-400 hover:text-emerald-200 bg-emerald-950/30 border border-emerald-900'
                                    : 'text-rose-400 hover:text-rose-200 bg-rose-950/30 border border-rose-900'
                                }`}
                              >
                                <AlertOctagon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Contents: Manual Transaction Approvals */}
        {activeTab === 'approvals' && (
          <div id="approvals_panel" className="bg-slate-900/30 border border-slate-900 rounded-xl p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-amber-500" />
                Manual Deposits & Withdrawals Approvals Console
              </h3>
              <p className="text-[11px] text-slate-400">Pending deposits (bank wire, manual UPI receipts) and manual withdrawals requiring administrative authentication before updates apply.</p>
            </div>

            {pendingTransactions.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/15">
                <CheckSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <span className="text-xs text-slate-400">No pending transaction approvals right now!</span>
                <p className="text-[10px] text-slate-500 mt-1">Submit manual requests inside the Sandbox tab to test this approval flow.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingTransactions.map((tx) => {
                  const userProfile = users.find(u => u.id === tx.userId);
                  const isDeposit = tx.type === 'deposit';

                  return (
                    <div key={tx.id} className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-white shrink-0">{tx.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            isDeposit 
                              ? 'bg-blue-950 border border-blue-500 text-blue-300' 
                              : 'bg-rose-950 border border-rose-500 text-rose-300'
                          }`}>
                            {tx.type === 'deposit' ? 'Manual Deposit' : 'Manual Withdrawal'}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Player Wallet:</span>
                            <span className="font-medium text-slate-200">
                              {userProfile ? `${userProfile.username} (${userProfile.id})` : tx.userId}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Current Balance:</span>
                            <span className="font-mono text-slate-300 font-semibold">
                              ${userProfile ? userProfile.balance.toFixed(2) : '0.00'}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Requested Amount:</span>
                            <span className="font-mono text-white font-bold text-sm">
                              ${tx.amount.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Audit Notes:</span>
                            <span className="text-slate-300 text-right italic font-sans max-w-[70%] truncate">
                              "{tx.notes || 'No payment reference'}"
                            </span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-900">
                            <span>Requested: {new Date(tx.timestamp).toLocaleString()}</span>
                            <span>IP: {tx.ipAddress}</span>
                          </div>
                        </div>
                      </div>

                      {userProfile?.status === 'suspended' ? (
                        <div className="bg-rose-950/40 border border-rose-900 rounded-lg p-2 flex items-center gap-2 text-[10px] text-rose-300">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>Player suspended. Unsuspend player before approving transaction.</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <button
                            onClick={() => handleRejectTransaction(tx.id)}
                            className="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 text-xs font-bold py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <XSquare className="w-3.5 h-3.5" /> Reject Request
                          </button>
                          <button
                            onClick={() => handleApproveTransaction(tx.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow"
                          >
                            <CheckSquare className="w-3.5 h-3.5" /> Approve Payment
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Contents: Combined Ledger */}
        {activeTab === 'ledger' && (
          <div id="ledger_panel" className="bg-slate-900/30 border border-slate-900 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-indigo-400" />
                  Cryptographic Transaction Ledger Logs
                </h3>
                <p className="text-[11px] text-slate-400">Auditable transactions list with unique integrity hashes checking for bad-actor modifications.</p>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={ledgerFilter}
                  onChange={(e) => setLedgerFilter(e.target.value)}
                  className="bg-slate-950 text-xs text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-800 focus:outline-none"
                >
                  <option value="all">All Transactions</option>
                  <option value="bet">Wager Bets</option>
                  <option value="win">Win Outcomes</option>
                  <option value="deposit">Deposits</option>
                  <option value="withdraw">Withdrawals</option>
                </select>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search ID, notes..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    className="bg-slate-950 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-48"
                  />
                </div>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg bg-slate-950/15">
                <Coins className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <span className="text-xs text-slate-400">No transactions match your filters.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-slate-400 font-medium uppercase tracking-wider">
                      <th className="py-2.5 px-3 font-mono">TX ID</th>
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3 font-mono">Player ID</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-right">Balance Change</th>
                      <th className="py-2.5 px-3">Integrity SHA-256</th>
                      <th className="py-2.5 px-3 text-center">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {filteredTransactions.map((tx) => {
                      const timeStr = new Date(tx.timestamp).toLocaleTimeString();
                      let typeLabel = '';
                      let typeColor = '';

                      switch (tx.type) {
                        case 'bet':
                          typeLabel = 'BET';
                          typeColor = 'text-amber-400 bg-amber-950/40 border border-amber-900/50';
                          break;
                        case 'win':
                          typeLabel = 'WIN Payout';
                          typeColor = 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/50';
                          break;
                        case 'deposit':
                          typeLabel = 'DEPOSIT';
                          typeColor = 'text-blue-400 bg-blue-950/40 border border-blue-900/50';
                          break;
                        case 'withdraw':
                          typeLabel = 'WITHDRAW';
                          typeColor = 'text-rose-400 bg-rose-950/40 border border-rose-900/50';
                          break;
                      }

                      return (
                        <tr key={tx.id} className="hover:bg-slate-900/40">
                          <td className="py-2.5 px-3 font-mono font-bold text-white">{tx.id}</td>
                          <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{new Date(tx.timestamp).toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-mono">{tx.userId}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider ${typeColor}`}>
                              {typeLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-white">${tx.amount.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[10px] text-slate-400">
                            {tx.status === 'pending' ? (
                              <span className="text-amber-500 font-semibold italic">Held (Pending)</span>
                            ) : tx.status === 'rejected' ? (
                              <span className="text-rose-500 line-through">Rejected</span>
                            ) : (
                              <span>${tx.previousBalance.toFixed(2)} → ${tx.newBalance.toFixed(2)}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[9px] text-indigo-400">
                            <div className="flex items-center gap-1 max-w-[150px]">
                              <span className="truncate" title={tx.hash}>{tx.hash}</span>
                              <button 
                                onClick={() => handleCopy(tx.hash, tx.id)}
                                className="hover:text-indigo-200 transition-colors shrink-0"
                              >
                                {copiedText === tx.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-600" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {tx.status === 'success' ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-900">
                                <Check className="w-2.5 h-2.5" /> Approved
                              </span>
                            ) : tx.status === 'pending' ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-900">
                                <Clock className="w-2.5 h-2.5" /> Pending
                              </span>
                            ) : tx.status === 'rejected' ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-400 bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-900">
                                <XCircle className="w-2.5 h-2.5" /> Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-400 bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-900">
                                <AlertOctagon className="w-2.5 h-2.5" /> Blocked
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Contents: Security Event Log */}
        {activeTab === 'security' && (
          <div id="security_panel" className="bg-slate-900/30 border border-slate-900 rounded-xl p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-rose-400" />
                Security Gateway Event Log
              </h3>
              <p className="text-[11px] text-slate-400">Audits security events, warning logs, blocked hacker tampering attempts, key rotation changes, and authentication checks.</p>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/15">
                <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <span className="text-xs text-slate-400">Security event log is currently clear. Try simulating illegal transactions with tampering.</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                {logs.map((log) => {
                  let badgeColor = '';
                  switch (log.status) {
                    case 'success':
                      badgeColor = 'bg-emerald-950 border border-emerald-900 text-emerald-400';
                      break;
                    case 'warning':
                      badgeColor = 'bg-amber-950 border border-amber-900 text-amber-400';
                      break;
                    case 'error':
                      badgeColor = 'bg-rose-950 border border-rose-900 text-rose-400 animate-pulse';
                      break;
                  }

                  return (
                    <div 
                      key={log.id} 
                      className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase font-mono ${badgeColor} shrink-0 mt-0.5`}>
                          {log.event}
                        </span>
                        <div>
                          <p className="text-slate-300 font-medium font-sans leading-relaxed">{log.details}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-slate-600" /> {new Date(log.timestamp).toLocaleString()}
                            </span>
                            <span>•</span>
                            <span>IP Address: {log.ipAddress}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-slate-600 self-end sm:self-center shrink-0">Log: {log.id.substring(0, 10)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Contents: Code Wizard */}
        {activeTab === 'code' && (
          <div id="code_panel" className="bg-slate-900/30 border border-slate-900 rounded-xl p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Code className="w-4 h-4 text-indigo-400" />
                Integration Code Wizard
              </h3>
              <p className="text-[11px] text-slate-400">Implement this Node.js script directly inside your slot, crash, roulette, or blackjack game server to connect securely and update user balances.</p>
            </div>

            <div className="relative">
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  id="btn_copy_code"
                  onClick={() => handleCopy(nodeIntegrationCode, 'code')}
                  className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedText === 'code' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-slate-950 border border-slate-900 rounded-lg p-4.5 text-xs font-mono text-indigo-300 overflow-x-auto max-h-[500px] leading-relaxed">
                {nodeIntegrationCode}
              </pre>
            </div>
          </div>
        )}

      </main>

      {/* PLAYER DETAIL MODAL (DETAILED AUDIT & BET HISTORY) */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in overflow-hidden">
            
            {/* Header */}
            <div className="border-b border-slate-800 p-4.5 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Player Audit: {selectedPlayer.username}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">UID: {selectedPlayer.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Profile details grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <span className="block text-[9px] text-slate-500 uppercase tracking-wider">Registration Date</span>
                  <span className="text-xs text-slate-200 font-medium block mt-1">
                    {new Date(selectedPlayer.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">
                    {new Date(selectedPlayer.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <span className="block text-[9px] text-slate-500 uppercase tracking-wider">Email Address</span>
                  <span className="text-xs text-indigo-400 font-mono font-medium block mt-1 truncate" title={selectedPlayer.email}>
                    {selectedPlayer.email || 'not_provided@mail.com'}
                  </span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Primary validation email</span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <span className="block text-[9px] text-slate-500 uppercase tracking-wider">UPI / Phone Verified</span>
                  <span className="text-xs text-slate-200 font-mono font-medium block mt-1">
                    {selectedPlayer.phoneNumber || '+91 99999 88888'}
                  </span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Contact Verification tag</span>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <span className="block text-[9px] text-slate-500 uppercase tracking-wider">Current Balance</span>
                  <span className="text-sm text-emerald-400 font-mono font-bold block mt-1">
                    ${selectedPlayer.balance.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Cleared secure balance</span>
                </div>
              </div>

              {/* Player stats calculations */}
              {(() => {
                const pTxs = transactions.filter(t => t.userId === selectedPlayer.id);
                const totalBets = pTxs.filter(t => t.type === 'bet' && t.status === 'success').reduce((sum, t) => sum + t.amount, 0);
                const totalWins = pTxs.filter(t => t.type === 'win' && t.status === 'success').reduce((sum, t) => sum + t.amount, 0);
                const totalDeposits = pTxs.filter(t => t.type === 'deposit' && t.status === 'success').reduce((sum, t) => sum + t.amount, 0);
                const totalWithdrawals = pTxs.filter(t => t.type === 'withdraw' && t.status === 'success').reduce((sum, t) => sum + t.amount, 0);
                const netProfit = totalWins - totalBets;

                return (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">Financial Turnover & Game Analytics</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                      <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40">
                        <span className="block text-[8px] text-slate-500">TOTAL DEPOSITS</span>
                        <strong className="text-blue-400 text-xs font-mono">${totalDeposits.toFixed(2)}</strong>
                      </div>
                      <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40">
                        <span className="block text-[8px] text-slate-500">TOTAL WITHDRAWALS</span>
                        <strong className="text-rose-400 text-xs font-mono">${totalWithdrawals.toFixed(2)}</strong>
                      </div>
                      <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40">
                        <span className="block text-[8px] text-slate-500">TOTAL WAGER BETS</span>
                        <strong className="text-amber-400 text-xs font-mono">${totalBets.toFixed(2)}</strong>
                      </div>
                      <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40">
                        <span className="block text-[8px] text-slate-500">TOTAL GAME WINS</span>
                        <strong className="text-emerald-400 text-xs font-mono">${totalWins.toFixed(2)}</strong>
                      </div>
                      <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40">
                        <span className="block text-[8px] text-slate-500">NET WIN/LOSS</span>
                        <strong className={`text-xs font-mono ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}
                        </strong>
                      </div>
                    </div>

                    {/* Specific player bet and ledger logs */}
                    <div className="pt-2">
                      <h4 className="text-xs font-bold text-white mb-2">Detailed Transaction & Bet History ({pTxs.length})</h4>
                      {pTxs.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-4">No transactions recorded for this player yet.</p>
                      ) : (
                        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                          <div className="max-h-[250px] overflow-y-auto">
                            <table className="w-full text-left text-[11px] border-collapse">
                              <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider sticky top-0">
                                <tr>
                                  <th className="py-2 px-3 font-mono">TX ID</th>
                                  <th className="py-2 px-3">Date</th>
                                  <th className="py-2 px-3">Type</th>
                                  <th className="py-2 px-3 text-right">Amount</th>
                                  <th className="py-2 px-3">Notes/Ref</th>
                                  <th className="py-2 px-3 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-900 text-slate-300">
                                {pTxs.map(t => {
                                  let labelClass = 'text-amber-400 bg-amber-950/30';
                                  if (t.type === 'win') labelClass = 'text-emerald-400 bg-emerald-950/30';
                                  if (t.type === 'deposit') labelClass = 'text-blue-400 bg-blue-950/30';
                                  if (t.type === 'withdraw') labelClass = 'text-rose-400 bg-rose-950/30';

                                  return (
                                    <tr key={t.id} className="hover:bg-slate-900/30">
                                      <td className="py-2 px-3 font-mono text-white">{t.id}</td>
                                      <td className="py-2 px-3 text-slate-400">{new Date(t.timestamp).toLocaleString()}</td>
                                      <td className="py-2 px-3">
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${labelClass}`}>
                                          {t.type.toUpperCase()}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold">${t.amount.toFixed(2)}</td>
                                      <td className="py-2 px-3 text-slate-400 italic max-w-[200px] truncate" title={t.notes}>{t.notes || 'No comments'}</td>
                                      <td className="py-2 px-3 text-center">
                                        <span className={`px-1 rounded text-[8px] font-semibold border ${
                                          t.status === 'success' 
                                            ? 'text-emerald-400 bg-emerald-950/30 border-emerald-900' 
                                            : t.status === 'pending'
                                            ? 'text-amber-400 bg-amber-950/30 border-amber-900'
                                            : 'text-rose-400 bg-rose-950/30 border-rose-900'
                                        }`}>
                                          {t.status.toUpperCase()}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Footer */}
            <div className="border-t border-slate-800 p-4.5 bg-slate-900/60 flex justify-end">
              <button
                onClick={() => setSelectedPlayer(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-5 rounded-lg transition-colors cursor-pointer"
              >
                Close Audit Record
              </button>
            </div>

          </div>
        </div>
      )}

      {/* EDIT PLAYER PROFILE MODAL */}
      {editingPlayer && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in overflow-hidden">
            
            {/* Header */}
            <div className="border-b border-slate-800 p-4.5 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Edit Profile: {editingPlayer.username}</h3>
              </div>
              <button 
                onClick={() => setEditingPlayer(null)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateProfile} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-semibold">UPI / Mobile Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Location / Country</label>
                <input
                  type="text"
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Security Risk Rating</label>
                  <select
                    value={editRiskScore}
                    onChange={(e) => setEditRiskScore(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs px-2 py-2 rounded-lg text-slate-200 focus:outline-none"
                  >
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Account status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs px-2 py-2 rounded-lg text-slate-200 focus:outline-none"
                  >
                    <option value="active">Active / Clear</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-semibold py-1.5 px-4 rounded-lg cursor-pointer border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-1.5 px-5 rounded-lg cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Footer Details */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-900 text-center text-[11px] text-slate-500 font-mono">
        <p>GamSecure Cryptographic Wallet Engine &copy; 2026 • Standard HMAC SHA-256 Authentication Protocol • Manual Financial Approvals Portal</p>
      </footer>
    </div>
  );
}
