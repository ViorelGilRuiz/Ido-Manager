export type Role = 'ADMIN' | 'CLIENT';

export type CurrentUser = {
  sub: string;
  email: string;
  role: Role;
  businessId: string | null;
};
