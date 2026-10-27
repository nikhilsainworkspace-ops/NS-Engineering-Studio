// Shared record shapes. Server code reads MongoDB documents (dates are Date objects);
// browser code receives the same records as JSON (dates are ISO strings).

export type ContactDoc = {
  category: string;
  name: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  birthday?: string;
  phoneLabel?: string;
  emailLabel?: string;
  phoneNumbers?: { label: "Mobile" | "Work" | "Home" | "Main" | "Other"; number: string }[];
  emailAddresses?: { label: "Work" | "Home" | "Other"; value: string }[];
  isTeamMember?: boolean;
  teamRole?: string;
  teamDepartment?: string;
  phone: string;
  email: string;
  organization: string;
  city: string;
  state: string;
  status: string;
  source: string;
  linkId: string;
  tags: string[];
  notes: string;
  followUpAt: Date | null;
  details: Record<string, string>;
  rating?: number;
  flag?: string;
  shareConsent?: string;
  lastContactedAt?: Date | null;
  interactions?: { _id: unknown; at: Date; type: string; note: string }[];
  createdAt: Date;
  updatedAt: Date;
};

export type ShareLinkDoc = {
  token: string;
  title: string;
  category: string;
  active: boolean;
  expiresAt: Date | null;
  submissions: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectDoc = {
  title: string;
  clientName: string;
  clientContactId: string;
  linkedContactIds: string[];
  city: string;
  state: string;
  projectType: string;
  status: string;
  estimatedValue: number | null;
  billedAmount?: number | null;
  receivedAmount?: number | null;
  startDate: Date | null;
  endDate: Date | null;
  followUpAt: Date | null;
  source: string;
  notes: string;
  siteAddress?: string; contractRef?: string; managerName?: string; scope?: string; budget?: number | null; progressPercent?: number | null;
  actualStartDate?: Date | null; actualEndDate?: Date | null; milestones?: { title: string; dueDate: Date | null; done: boolean; doneAt: Date | null; weight?: number }[];
  createdAt: Date;
  updatedAt: Date;
};

export type LoginAttemptDoc = {
  key: string;
  count: number;
  windowStart: Date;
  blockedUntil: Date | null;
};

/** What the browser receives for one contact (JSON). */
export type ContactRecord = {
  _id: string; category: string; name: string; firstName?: string; lastName?: string; jobTitle?: string; birthday?: string; phoneLabel?: string; emailLabel?: string; phoneNumbers?: { label: "Mobile" | "Work" | "Home" | "Main" | "Other"; number: string }[]; emailAddresses?: { label: "Work" | "Home" | "Other"; value: string }[]; isTeamMember?: boolean; teamRole?: string; teamDepartment?: string; phone: string; email: string; organization: string; city: string; state: string;
  status: string; source: string; linkId?: string; tags: string[]; notes: string; followUpAt?: string | null;
  details: Record<string, string>; createdAt: string; updatedAt: string;
  rating?: number; flag?: string; shareConsent?: string; lastContactedAt?: string | null; interactions?: InteractionRecord[];
};

export type InteractionRecord = { _id: string; at: string; type: string; note: string };

export type ShareLinkRecord = {
  _id: string; token: string; title: string; category: string; active: boolean; expiresAt?: string | null;
  submissions: number; shareUrl: string; createdAt: string;
};

export type ProjectRecord = {
  _id: string; title: string; clientName: string; clientContactId: string; linkedContactIds: string[];
  city: string; state: string; projectType: string; status: string; estimatedValue: number | null;
  billedAmount?: number | null; receivedAmount?: number | null;
  startDate?: string | null; endDate?: string | null; followUpAt?: string | null; source: string; notes: string;
  siteAddress?: string; contractRef?: string; managerName?: string; scope?: string; budget?: number | null; progressPercent?: number | null;
  actualStartDate?: string | null; actualEndDate?: string | null; milestones?: { _id?: string; title: string; dueDate?: string | null; done: boolean; doneAt?: string | null; weight?: number }[];
  createdAt: string; updatedAt: string;
};

export type SessionDoc = { sidHash: string; ip: string; agent: string; lastSeenAt: Date; expiresAt: Date; revokedAt: Date | null; createdAt: Date };
export type AuditDoc = { at: Date; action: string; detail: string; ip: string; agent: string };
export type RateDoc = {
  item: string; group: string; spec: string; unit: string; rate: number; supplierName: string; supplierContactId: string;
  city: string; state: string; validTill: Date | null; notes: string; createdAt: Date; updatedAt: Date;
};
export type DataRoomDoc = {
  token: string; title: string; recipientName: string; recipientContact: string; message: string; dataset: "contacts" | "rates";
  columns: { key: string; label: string }[]; rows: Record<string, string>[]; rowCount: number; masked: boolean;
  active: boolean; expiresAt: Date; passcodeHash: string; failedAttempts: number; lockedUntil: Date | null;
  maxViews: number | null; viewCount: number; allowDownload: boolean; watermark: boolean;
  price: number | null; paymentStatus: string; paidAt: Date | null; requirePayment: boolean; invoiceNote: string;
  lastViewedAt: Date | null; accessLog: { at: Date; kind: string; ip: string; agent: string }[]; createdAt: Date; updatedAt: Date;
};

export type RateRecord = {
  _id: string; item: string; group: string; spec: string; unit: string; rate: number; supplierName: string; supplierContactId: string;
  city: string; state: string; validTill?: string | null; notes: string; createdAt: string; updatedAt: string;
};
export type RoomRecord = {
  _id: string; title: string; recipientName: string; recipientContact: string; message: string; dataset: "contacts" | "rates"; rowCount: number; masked: boolean;
  active: boolean; expiresAt: string; hasPasscode: boolean; maxViews: number | null; viewCount: number; allowDownload: boolean; watermark: boolean;
  price: number | null; paymentStatus: string; paidAt?: string | null; requirePayment: boolean; invoiceNote: string; lastViewedAt?: string | null;
  status: string; shareUrl: string; createdAt: string; accessLog?: { at: string; kind: string; ip: string; agent: string }[];
  columns?: { key: string; label: string }[]; preview?: Record<string, string>[];
};


export type TaskDoc = {
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  dueAt: Date | null;
  relatedKind: "none" | "contact" | "project";
  relatedId: string;
  assignedContactId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TaskRecord = {
  _id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  dueAt?: string | null;
  relatedKind: "none" | "contact" | "project";
  relatedId: string;
  assignedContactId?: string;
  createdAt: string;
  updatedAt: string;
};


export type PrivateNoteHistoryEntry = { title: string; content: string; tags: string[]; at: Date | string };
export type PrivateNoteDoc = {
  title: string; content: string; tags: string[]; pinned: boolean; archived: boolean; favorite?: boolean;
  folder?: string; category?: string; projectId?: string; dueAt?: Date | null; deletedAt?: Date | null;
  history?: PrivateNoteHistoryEntry[]; createdAt: Date; updatedAt: Date;
};

export type PrivateNoteRecord = {
  _id: string; title: string; content: string; tags: string[]; pinned: boolean; archived: boolean;
  favorite?: boolean; folder?: string; category?: string; projectId?: string; dueAt?: string | null; deletedAt?: string | null;
  history?: { title: string; content: string; tags: string[]; at: string }[]; createdAt: string; updatedAt: string;
};
