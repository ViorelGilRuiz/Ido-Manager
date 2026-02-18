export type Role = 'ADMIN' | 'CLIENT';

export type CurrentUser = {
  id: string;
  email: string;
  role: Role;
  businessId: string | null;
};

export type AuthResponse = {
  accessToken: string;
  user: CurrentUser;
};

export type TemplateType =
  | 'CHECKLIST'
  | 'TIMELINE'
  | 'BUDGET'
  | 'GUEST_LIST'
  | 'VENDOR_LIST';

export type EventType = 'WEDDING' | 'EVENT' | 'OTHER';
export type EventStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type TemplateModel = {
  id: string;
  name: string;
  description?: string;
  type: TemplateType;
  schemaJson: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type EventModel = {
  id: string;
  title: string;
  type: EventType;
  status: EventStatus;
  date?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type DocumentModel = {
  id: string;
  name: string;
  dataJson: Record<string, unknown>;
  template: TemplateModel;
  createdAt?: string;
  updatedAt?: string;
};
