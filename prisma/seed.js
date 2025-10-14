import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hris.local' },
    update: {},
    create: {
      email: 'admin@hris.local',
      firstName: 'Admin',
      lastName: 'HR',
      isAdmin: true,
      password: await bcrypt.hash('admin123', 10)
    }
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@company.local' },
    update: {},
    create: {
      email: 'staff@company.local',
      firstName: 'Staff',
      lastName: 'One',
      password: await bcrypt.hash('staff123', 10)
    }
  });

  const emp = await prisma.employee.create({
    data: { userId: staff.id, firstName: 'Staff', lastName: 'One', gender: 'F' }
  });

  await prisma.employeeCredential.upsert({
    where: { companyUser_empCode: { companyUser: 'CMLABS', empCode: 'EMP001' } },
    update: { isActive: true },
    create: {
      employeeId: emp.id,
      companyUser: 'CMLABS',
      empCode: 'EMP001',
      password: await bcrypt.hash('emp-pass', 10)
    }
  });

  await prisma.letterFormat.create({
    data: { name: 'Surat Keterangan Kerja', content: 'Yang bertanda tangan ... {{employee.firstName}} {{employee.lastName}} ...' }
  });

  console.log('Seed complete', { admin: admin.email, staff: staff.email });
}

main().catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
