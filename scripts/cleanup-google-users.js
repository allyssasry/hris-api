// Script to cleanup Google OAuth test users
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  try {
    // Find all users with Google OAuth accounts
    const oauthAccounts = await prisma.oAuthAccount.findMany({
      where: { provider: 'google' },
      include: { user: true }
    });

    console.log('Found', oauthAccounts.length, 'Google OAuth accounts');

    for (const account of oauthAccounts) {
      console.log(`- User: ${account.user.email}, Role: ${account.user.role}, CompanyId: ${account.user.companyId}`);
    }

    // Delete Google OAuth accounts first (to avoid foreign key issues)
    const deletedOAuth = await prisma.oAuthAccount.deleteMany({
      where: { provider: 'google' }
    });
    console.log('\nDeleted', deletedOAuth.count, 'OAuth accounts');

    // Delete users that have no password (OAuth users only)
    const deletedUsers = await prisma.user.deleteMany({
      where: { 
        password: '',
        companyId: null  // Only delete users without company (incomplete setup)
      }
    });
    console.log('Deleted', deletedUsers.count, 'incomplete OAuth users');

    console.log('\n✅ Cleanup complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
