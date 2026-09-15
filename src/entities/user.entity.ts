import { BaseEntity } from "./base.entity";

export interface User extends BaseEntity {
  name: string;
  email: string;
  schoolId: string;
  referralCode: string;
  referredById: string | null;
}
