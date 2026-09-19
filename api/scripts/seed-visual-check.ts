import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import bcrypt from 'bcrypt';
import { prisma } from '../src/utils/prisma';

async function main() {
  const email = 'visualcheck@example.com';
  const password = 'VisualCheck123!';
  const passwordHash = await bcrypt.hash(password, 4);

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { name: 'Visual Check', email, passwordHash, isVerified: true, isPro: true },
    });
  } else {
    user = await prisma.user.update({ where: { id: user.id }, data: { passwordHash, isVerified: true, isPro: true } });
  }

  let shop = await prisma.shop.findUnique({ where: { slug: 'visual-check-shop' } });
  if (!shop) {
    shop = await prisma.shop.create({ data: { name: 'Visual Check Shop', slug: 'visual-check-shop', isActive: true } });
  }

  let owner = await prisma.userShop.findFirst({ where: { userId: user.id, shopId: shop.id } });
  if (!owner) {
    owner = await prisma.userShop.create({
      data: { userId: user.id, shopId: shop.id, role: 'owner', name: user.name!, email: user.email, canViewCustomerDetails: true },
    });
  }

  let staffUser = await prisma.user.findUnique({ where: { email: 'staffcheck@example.com' } });
  if (!staffUser) {
    staffUser = await prisma.user.create({
      data: { name: 'Staff Checker', email: 'staffcheck@example.com', isVerified: true },
    });
  }
  let staff = await prisma.userShop.findFirst({ where: { userId: staffUser.id, shopId: shop.id } });
  if (!staff) {
    staff = await prisma.userShop.create({
      data: { userId: staffUser.id, shopId: shop.id, role: 'staff', name: staffUser.name!, email: staffUser.email, canViewCustomerDetails: true },
    });
  }

  let service = await prisma.service.findFirst({ where: { shopId: shop.id, name: 'Haircut' } });
  if (!service) {
    service = await prisma.service.create({ data: { shopId: shop.id, name: 'Haircut', duration: 30, price: 2000 } });
  }

  const existingSchedule = await prisma.shopWorkingSchedule.findFirst({ where: { shopId: shop.id, staffId: null } });
  if (!existingSchedule) {
    await prisma.shopWorkingSchedule.create({
      data: {
        shopId: shop.id,
        staffId: null,
        startDate: new Date('2027-01-01T00:00:00.000Z'),
        isActive: true,
        days: {
          create: [
            { day: 'MON', isOpen: true, hours: { create: [{ startTime: '09:00', endTime: '17:00' }] } },
            { day: 'TUE', isOpen: true, hours: { create: [{ startTime: '09:00', endTime: '17:00' }] } },
            { day: 'WED', isOpen: false },
          ],
        },
      },
    });
  }

  console.log('READY');
  console.log('login email:', email);
  console.log('login password:', password);
  console.log('shop slug:', shop.slug);
  console.log('staff memberId:', staff.id);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
