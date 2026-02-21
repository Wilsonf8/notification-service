/**
 * TypeScript types for API requests and responses.
 * These match the backend DTOs and entities.
 * @module lib/types
 */

/** User entity returned from the API */
export interface User {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
}

/** Project type enum */
export type ProjectType = "LIVECONNECT";

/** Project entity returned from the API */
export interface Project {
  id: string;
  name: string;
  description: string | null;
  type: ProjectType;
  organizationSlug: string;
  createdAt: string;
  updatedAt?: string;
}

/** Request body for creating a project */
export interface CreateProjectRequest {
  name: string;
  type?: ProjectType;
}

/** Request body for updating a project */
export interface UpdateProjectRequest {
  name: string;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

/** Dashboard stats response */
export interface DashboardStats {
  totalProjects: number;
}

/** Organization role enum */
export type OrgRole = "OWNER" | "ADMIN" | "MEMBER";

/** Organization entity returned from the API */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  isPersonal: boolean;
  userRole: OrgRole;
  createdAt: string;
}

/** Organization member returned from the API */
export interface OrganizationMember {
  id: string;
  userId: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: OrgRole;
  joinedAt: string;
}

/** Request body for creating an organization */
export interface CreateOrganizationRequest {
  name: string;
}

/** Request body for updating an organization */
export interface UpdateOrganizationRequest {
  name: string;
}

/** Request body for adding a member to an organization */
export interface AddMemberRequest {
  username: string;
  role: OrgRole;
}

/** Request body for updating a member's role */
export interface UpdateMemberRoleRequest {
  role: OrgRole;
}

/** User search result returned from the search API */
export interface UserSearchResult {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
}

/** Invitation status enum */
export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED";

/** Organization invitation returned from the API */
export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  inviterId: string;
  inviterUsername: string;
  inviteeId: string;
  inviteeUsername: string;
  inviteeFirstName: string | null;
  inviteeLastName: string | null;
  inviteeEmail: string | null;
  inviteeAvatarUrl: string | null;
  role: OrgRole;
  status: InvitationStatus;
  createdAt: string;
}

/** Request body for creating an invitation */
export interface CreateInvitationRequest {
  userId: string;
  role: OrgRole;
}

/** LiveConnect embed key returned from the API */
export interface LiveConnectEmbedKey {
  id: string;
  name: string;
  keyPrefix: string;
  allowedDomains: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

/** Response when creating a new embed key (includes full key shown once) */
export interface LiveConnectEmbedKeyCreated {
  id: string;
  name: string;
  key: string;
  allowedDomains: string[];
  createdAt: string;
}

/** Request body for creating an embed key */
export interface CreateEmbedKeyRequest {
  name: string;
  allowedDomains: string[];
}

/** Request body for updating an embed key */
export interface UpdateEmbedKeyRequest {
  name: string;
  allowedDomains: string[];
}

// ============================================================================
// LiveConnect Settings Types
// ============================================================================

/** Valid widget positions */
export type WidgetPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

/** Valid widget font families */
export type WidgetFontFamily =
  | "JetBrains Mono"
  | "Inter"
  | "DM Sans"
  | "Nunito"
  | "System Default";

/** Valid widget icon names */
export type WidgetIcon =
  | "video"
  | "message-circle"
  | "phone"
  | "headset"
  | "mail"
  | "microphone"
  | "lifebuoy"
  | "help-circle"
  | "first-aid-kit"
  | "shield-check"
  | "building"
  | "briefcase"
  | "shopping-cart"
  | "store"
  | "receipt"
  | "code"
  | "terminal"
  | "cpu"
  | "device-desktop"
  | "cloud"
  | "palette"
  | "camera"
  | "music"
  | "photo"
  | "brush"
  | "star"
  | "heart"
  | "bolt"
  | "rocket"
  | "diamond"
  | "flame";

/** LiveConnect settings returned from the API */
export interface LiveConnectSettings {
  welcomeMessage: string;
  offlineMessage: string;
  widgetColor: string;
  widgetPosition: WidgetPosition;
  isActive: boolean;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontFamily: WidgetFontFamily;
  widgetIcon: WidgetIcon;
}

/** Request body for updating LiveConnect settings */
export interface UpdateLiveConnectSettingsRequest {
  welcomeMessage?: string;
  offlineMessage?: string;
  widgetColor?: string;
  widgetPosition?: WidgetPosition;
  isActive?: boolean;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  fontFamily?: WidgetFontFamily;
  widgetIcon?: WidgetIcon;
}

// ============================================================================
// LiveConnect Dashboard Types
// ============================================================================

/** Rep availability status */
export type RepAvailability = "AVAILABLE" | "UNAVAILABLE";

/** Rep presence status */
export type RepPresence = "OFFLINE" | "ONLINE" | "IN_CALL";

/** LiveConnect rep returned from the API */
export interface LiveConnectRep {
  id: string;
  userId: string;
  name: string;
  email: string;
  availability: RepAvailability;
  presence: RepPresence;
}

/** LiveConnect visitor browsing the site */
export interface LiveConnectVisitor {
  id: string;
  visitorId: string;
  name: string | null;
  email: string | null;
  currentPage: string | null;
  currentPageTitle: string | null;
  lastSeenAt: string;
  isConnected: boolean;
  isPingable: boolean;
  isFirstVisit: boolean;
  previousVisitEndedAt: string | null;
  totalVisitCount: number;
}

/** A single visitor visit (browsing session) */
export interface VisitorVisit {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
}

/** Visit statistics across time windows */
export interface VisitorVisitStats {
  visits24h: number;
  visits3d: number;
  visits7d: number;
  total: number;
}

/** Engagement activity statistics across time windows */
export interface VisitorEngagementStats {
  pingsReceived24h: number;
  pingsReceived3d: number;
  pingsReceived7d: number;
  requestsSent24h: number;
  requestsSent3d: number;
  requestsSent7d: number;
  callsJoined24h: number;
  callsJoined3d: number;
  callsJoined7d: number;
}

/** Response from the visitor visits API endpoint */
export interface VisitorDetailResponse {
  stats: VisitorVisitStats;
  engagement: VisitorEngagementStats;
  recentVisits: VisitorVisit[];
  totalVisits: number;
  totalPages: number;
}

/** Request status enum */
export type RequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "EXPIRED"
  | "DECLINED"
  | "CANCELLED";

/** Request direction enum */
export type RequestDirection = "USER_TO_REPS" | "REP_TO_USER" | "MUTUAL";

/** LiveConnect request for a call */
export interface LiveConnectRequest {
  id: string;
  visitorId: string;
  visitorName: string | null;
  direction: RequestDirection;
  status: RequestStatus;
  expiresAt: string;
  createdAt: string;
}

/** Conversation type enum */
export type ConversationType = "VIDEO_CALL" | "CONTACT_FORM";

/** Conversation status enum */
export type ConversationStatus = "ACTIVE" | "ENDED";

/** Visitor info in conversation */
export interface ConversationVisitor {
  id: string;
  visitorId: string;
  name: string | null;
  email: string | null;
}

/** Rep info in conversation */
export interface ConversationRep {
  id: string;
  userId: string;
  name: string;
  email: string;
}

/** LiveConnect conversation (video call or contact form submission) */
export interface LiveConnectConversation {
  id: string;
  visitor: ConversationVisitor;
  rep: ConversationRep | null;
  type: ConversationType;
  status: ConversationStatus;
  callDurationSeconds: number | null;
  startedAt: string;
  endedAt: string | null;
  messageCount: number;
}

/** LiveConnect message in a conversation */
export interface LiveConnectMessage {
  id: string;
  conversationId: string;
  senderType: "USER" | "REP" | "SYSTEM";
  senderId: string | null;
  content: string;
  createdAt: string;
}

/** Active call displayed in "In Call" section */
export interface ActiveCall {
  conversationId: string;
  visitorId: string;
  visitorName: string | null;
  repId: string;
  repUserId: string;
  repName: string;
  startedAt: string;
}

/** Response from getVisitors API */
export interface VisitorsResponse {
  browsing: LiveConnectVisitor[];
  queue: LiveConnectRequest[];
  inCall: ActiveCall[];
}

/** Response from acceptRequest API */
export interface AcceptRequestResponse {
  conversationId: string;
  roomName: string;
  token: string;
  liveKitUrl: string;
}

/** Response from getConversationToken API */
export interface ConversationTokenResponse {
  token: string;
  roomName: string;
  liveKitUrl: string;
}

/** Request body for updating rep availability */
export interface UpdateAvailabilityRequest {
  availability: "available" | "unavailable";
}

/** Request body for adding a rep to a project */
export interface AddRepRequest {
  userId: string;
}

/** Request body for sending a message */
export interface SendMessageRequest {
  content: string;
}

/** Paginated conversations response */
export interface ConversationsResponse {
  conversations: LiveConnectConversation[];
  totalElements: number;
  totalPages: number;
  size: number;
  page: number;
}

/** Conversation filter parameters */
export interface ConversationFilters {
  status?: ConversationStatus;
  type?: ConversationType;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

// ============================================================================
// Billing & Subscription Types
// ============================================================================

/** Subscription status enum */
export type SubscriptionStatus =
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "INCOMPLETE"
  | "INACTIVE";

/** Subscription status returned from the billing API */
export interface Subscription {
  status: SubscriptionStatus;
  stripePriceId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
}

/** Response from creating a checkout session (PaymentIntent client secret) */
export interface CheckoutSessionResponse {
  clientSecret: string;
}

/** Response from creating a SetupIntent for updating payment method */
export interface SetupIntentResponse {
  clientSecret: string;
}

/** A single Stripe invoice */
export interface Invoice {
  id: string;
  date: number;
  description: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  invoicePdfUrl: string | null;
  hostedInvoiceUrl: string | null;
}

/** Paginated response for listing invoices with cursor-based pagination */
export interface InvoiceListResponse {
  invoices: Invoice[];
  hasMore: boolean;
  nextCursor: string | null;
}

/** Upcoming Stripe invoice with payment card details */
export interface UpcomingInvoice {
  amountDue: number;
  currency: string;
  nextBillingDate: number;
  description: string;
  cardBrand: string | null;
  cardLast4: string | null;
}
