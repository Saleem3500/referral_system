import { BaseEntity } from "./base.entity";

export interface Referral extends BaseEntity {
  schoolId: string;
  referrerId: string;
  referredId: string;
}
