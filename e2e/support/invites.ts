import { createHash } from 'crypto';
import { query } from './db';

/**
 * A pending invite for the seeded owner's email (owner@e2e.test, user u1) into
 * a new shop they are not a member of yet. Delete the shop to clean up: it
 * cascades the placeholder member and the invite.
 */
export async function addPendingInvite({ shopId, slug, name, token }: { shopId: string; slug: string; name: string; token: string }) {
  await query(
    `insert into "Shop"(id,name,slug,timezone,"maxAdvanceDays","updatedAt")
     values ($1,$2,$3,'Europe/Athens',730,now())`,
    [shopId, name, slug],
  );
  await query(
    `insert into "UserShop"(id,"shopId",role,name,email)
     values ($1,$2,'staff','E2E Owner','owner@e2e.test')`,
    [`${shopId}-us`, shopId],
  );
  await query(
    `insert into "ShopInvite"(id,"shopId","userShopId",email,role,"tokenHash","expiresAt","createdById","updatedAt")
     values ($1,$2,$3,'owner@e2e.test','staff',$4,now() + interval '7 days','u1',now())`,
    [`${shopId}-invite`, shopId, `${shopId}-us`, createHash('sha256').update(token).digest('hex')],
  );
}
