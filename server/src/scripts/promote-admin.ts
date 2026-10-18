import { connectDatabase } from '../config/db.js';
import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import { runInTransaction } from '../services/transaction.service.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes('@')) {
  console.error('Usage: npm run admin:promote -- user@example.com');
  process.exit(1);
}

try {
  await connectDatabase();
  await runInTransaction(async (session) => {
    const account = await User.findOne({ email }).session(session);
    if (!account) throw new Error('No registered account exists for that email. Register first, then run this command.');
    if (account.role === 'admin') return;
    account.role = 'admin';
    await account.save({ session });
    await AuditLog.create([{ actorId: account._id, action: 'bootstrap_admin_promoted', targetType: 'user', targetId: String(account._id), reason: 'Initial administrator provisioned by an operator with database access.' }], { session });
  });
  console.info(`Administrator role configured for ${email}. Sign out and sign in again to refresh the session role.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  process.exitCode ||= 0;
  const { default: mongoose } = await import('mongoose');
  await mongoose.disconnect();
}
