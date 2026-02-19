import { merchantsRepo } from '../db/repositories/merchantsRepo';

export interface MerchantDto {
  id: string;
  name: string;
  vatNumber?: string;
  address?: string;
  role: string;
}

export const merchantService = {
  async ensureUserMerchants(userId: string): Promise<MerchantDto[]> {
    await merchantsRepo.assignDefaultMemberships(userId);
    const memberships = await merchantsRepo.listUserMerchants(userId);

    return memberships.map((membership) => ({
      id: membership.merchant.id,
      name: membership.merchant.name,
      vatNumber: membership.merchant.vatNumber ?? undefined,
      address: membership.merchant.address ?? undefined,
      role: membership.role
    }));
  },

  async userHasMerchantAccess(userId: string, merchantId: string): Promise<boolean> {
    return merchantsRepo.userHasMerchantAccess(userId, merchantId);
  }
};
