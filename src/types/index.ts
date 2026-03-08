import { Request } from 'express';

// User Types
export interface IUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserCreate {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface IUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  createdAt: Date;
}

// Wallet Types
export interface IWallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWalletResponse {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  createdAt: Date;
}

// Transaction Types
export enum TransactionType {
  FUNDING = 'FUNDING',
  TRANSFER = 'TRANSFER',
  WITHDRAWAL = 'WITHDRAWAL',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export interface ITransaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description: string;
  reference: string;
  recipientWalletId?: string;
  metadata?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransactionResponse {
  id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description: string;
  reference: string;
  createdAt: Date;
  recipient?: IUserResponse;
}

// Auth Types
export interface IAuthRequest extends Request {
  user?: IUser;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IAuthResponse {
  user: IUserResponse;
  token: string;
}

// Fund Account Types
export interface IFundAccountRequest {
  amount: number;
  description?: string;
}

// Transfer Types
export interface ITransferRequest {
  recipientEmail: string;
  amount: number;
  description?: string;
}

// Withdrawal Types
export interface IWithdrawalRequest {
  amount: number;
  description?: string;
  bankAccount?: string;
  bankCode?: string;
}

// Karma Blacklist Types
export interface IKarmaBlacklistResponse {
  status: string;
  message: string;
  data?: {
    blacklisted: boolean;
    details?: {
      identity: string;
      identityType: string;
      reason: string;
      dateAdded: string;
    };
  };
}

// API Response Types
export interface IApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

// Pagination Types
export interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IPaginatedResponse<T> {
  data: T[];
  pagination: IPagination;
}
