import {
  SubscriptionPlan,
  SubscriptionStatus,
  PaymentMethod,
  PaymentStatus,
} from '../constants/enums';

/**
 * A user's subscription to premium content.
 */
export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startsAt: string;
  expiresAt: string;
  paymentReference: string | null;
  createdAt: string;
}

/**
 * Request to initiate a new subscription purchase.
 */
export interface InitiateSubscriptionRequest {
  plan: SubscriptionPlan;
  paymentMethod: PaymentMethod;
}

/**
 * Response after initiating a subscription.
 * For Telebirr/CBE Birr: includes a redirect URL to the payment provider.
 * For bank transfer: includes bank details for the user to deposit to.
 */
export interface InitiateSubscriptionResponse {
  subscriptionId: string;
  paymentMethod: PaymentMethod;
  paymentUrl: string | null;
  bankDetails: BankDetails | null;
}

/**
 * Bank account details shown to users who choose bank transfer.
 */
export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  reference: string;
}

/**
 * A payment record in the system (visible in admin dashboard).
 */
export interface Payment {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  providerReference: string | null;
  createdAt: string;
  verifiedAt: string | null;
}
