import { Merchant } from '../../../types/models';
import { localDb } from '../index';

export const merchantsRepo = {
  async listMerchants(): Promise<Merchant[]> {
    return localDb.getMerchants();
  },

  async saveMerchant(merchant: Merchant): Promise<void> {
    await localDb.upsertMerchant(merchant);
  }
};
