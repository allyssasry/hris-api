import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  // Create company first
  let company = await prisma.company.findFirst({ where: { name: 'CMLABS' } });
  
  // Create admin user first (needed as company owner)
  const adminPassword = await bcrypt.hash('admin123', 10);
  let admin = await prisma.user.upsert({
    where: { email: 'allyssasry@student.ub.ac.id' },
    update: { password: adminPassword },
    create: {
      email: 'allyssasry@student.ub.ac.id',
      username: 'allyssasry',
      firstName: 'Admin',
      lastName: 'HRIS',
      role: 'admin',
      password: adminPassword
    }
  });

  // Create company with admin as owner
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'CMLABS',
        ownerId: admin.id
      }
    });
  }

  // Update admin's company
  await prisma.user.update({
    where: { id: admin.id },
    data: { companyId: company.id }
  });

  // Create staff user
  const staffPassword = await bcrypt.hash('staff123', 10);
  const staff = await prisma.user.upsert({
    where: { email: 'staff@company.local' },
    update: { password: staffPassword },
    create: {
      email: 'staff@company.local',
      username: 'staffone',
      firstName: 'Staff',
      lastName: 'One',
      role: 'employee',
      password: staffPassword,
      companyId: company.id
    }
  });

  // Check if employee exists
  let emp = await prisma.employee.findFirst({ 
    where: { employeeId: 'EMP001' } 
  });
  
  if (!emp) {
    emp = await prisma.employee.create({
      data: { 
        employeeId: 'EMP001',
        userId: staff.id, 
        firstName: 'ALLYSSA AYU', 
        lastName: 'SORAYA', 
        gender: 'Female',
        companyId: company.id
      }
    });
  }

  // Create employee credential
  await prisma.employeeCredential.upsert({
    where: { companyUser_empCode: { companyUser: 'CMLABS', empCode: 'EMP001' } },
    update: { isActive: true, password: await bcrypt.hash('password', 10) },
    create: {
      employeeId: emp.id,
      companyUser: 'CMLABS',
      empCode: 'EMP001',
      password: await bcrypt.hash('password', 10)
    }
  });

  // Create letter format
  const letterFormat = await prisma.letterFormat.findFirst({ where: { name: 'Surat Keterangan Kerja' } });
  if (!letterFormat) {
    await prisma.letterFormat.create({
      data: { name: 'Surat Keterangan Kerja', content: 'Yang bertanda tangan ... {{employee.firstName}} {{employee.lastName}} ...' }
    });
  }

  console.log('✅ Seed complete!');
  console.log('   Admin:', admin.email, '/ password: admin123');
  console.log('   Staff:', staff.email, '/ password: staff123');
  console.log('   Employee ID:', emp.employeeId, '/ password: password');
  console.log('   Company:', company.name);
}

main().catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
