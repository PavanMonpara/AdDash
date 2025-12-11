// Core types for the admin panel

export type Role = 'SuperAdmin' | 'Support' | 'Finance' | 'Compliance';

// Custom roles with granular permissions
export interface CustomRole {
  _id: string;
  roleName?: string;
  description: string;
  type?: string
  name:string
  isSystem: boolean; // true for predefined roles (SuperAdmin, Support, etc.)
  permissions: RolePermissions;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  assignedTo: number; // count of admins with this role
}

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export?: boolean;
}

export interface RolePermissions {
  dashboard: {
    view: boolean;
  };
  userManagement: ModulePermission;
  listenerManagement: ModulePermission;
  sessionManagement: ModulePermission & {
    endSession: boolean;
  };
  compliance: ModulePermission & {
    viewMessages: boolean;
    flagContent: boolean;
  };
  walletPayments: ModulePermission & {
    processRefund: boolean;
    approveWithdrawal: boolean;
    manualAdjustment: boolean;
  };
  supportTicketing: ModulePermission & {
    assignTickets: boolean;
    closeTickets: boolean;
  };
  notifications: ModulePermission & {
    sendPush: boolean;
    sendEmail: boolean;
  };
  reports: {
    view: boolean;
    export: boolean;
    accessFinancial: boolean;
  };
  settings: ModulePermission & {
    modifyRazorpay: boolean;
    modifyCommission: boolean;
  };
  adminManagement: ModulePermission;
  rolesPermissions: ModulePermission;
  systemHealth: {
    view: boolean;
  };
}

export type UserStatus = 'active' | 'blocked' | 'deleted';
export type ListenerStatus = 'pending' | 'approved' | 'suspended' | 'rejected';
export type SessionType = 'chat' | 'audio' | 'video';
export type SessionStatus = 'ongoing' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type TransactionType = 'deposit' | 'withdrawal' | 'session_payment' | 'refund' | 'commission' | 'manual_credit' | 'manual_debit';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: Role;
  customRoleId?: string; // If using custom role instead of predefined role
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  twoFactorEnabled: boolean;
  permissions: string[];
}

export interface UserSessionDetails {
  _id: string;
  user: string;
  listener: string;
  type: string;
  status: string;
  startTime: string;
}

export interface User {
  _id: string;
  userId: string;
  alias: string;
  contact: {
    email: string;
    phone: string;
  };
  status: string;
  wallet: number;
  registered: string;
  lastActive?: string;
  sessions: number;
  totalSpent?: number;
  role: string;
  tickets: number;
  ticketDetails: any[];
  sessionDetails: UserSessionDetails[];
}


export interface Listener {
  _id: string;
  name: string;
  email: string;
  expertiseTags: string[];
  experience: number;
  rating: number;
  verificationStatus: ListenerStatus;
  earnings: number;
  totalSessions: number;
  joinedDate: string;
  commission: number;
  avatar?: string;
}

export interface Session {
  _id: string;
  userAlias: string;
  userId: string;
  listenerName: string;
  listenerId: string;
  type: SessionType;
  startTime: string;
  endTime?: string;
  duration: number;
  status: SessionStatus;
  paymentStatus: PaymentStatus;
  amount: number;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  type: TransactionType;
  method: string;
  status: PaymentStatus;
  timestamp: string;
  razorpayId?: string;
}

export interface Ticket {
  id: string;
  creatorId: string;
  creatorName: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  replies: TicketReply[];
}

export interface TicketReply {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  content: string;
  isInternal: boolean;
  timestamp: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  target: 'all_users' | 'all_listeners' | 'specific';
  targetIds?: string[];
  scheduled?: string;
  status: 'draft' | 'scheduled' | 'sent';
  createdAt: string;
  sentCount?: number;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  module: string;
  details: string;
  ip: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  flagged?: boolean;
}

export interface AppSettings {
  appName: string;
  appVersion: string;
  forceUpdateVersion: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  commissionRate: number;
  messageRetentionDays: number;
  termsAndConditions: string;
  privacyPolicy: string;
}

export interface KPIData {
  totalUsers: number;
  activeListeners: number;
  liveSessions: number;
  monthlyRevenue: number;
  pendingWithdrawals: number;
  openTickets: number;
}

export interface ActivityFeedItem {
  id: string;
  type: 'signup' | 'payment' | 'ticket' | 'session';
  message: string;
  timestamp: string;
  icon: string;
}
