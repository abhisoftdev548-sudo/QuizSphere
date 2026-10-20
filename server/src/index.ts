import mongoose from 'mongoose';
import { app } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { Category } from './models/Category.js';
import { PlatformConfig } from './models/PlatformConfig.js';
import { settleDueSpecialEventPrizes } from './services/specialEventSettlement.service.js';

const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.info(`QuizSphere API listening on 0.0.0.0:${env.PORT}`);
});
let settlementTimer: NodeJS.Timeout | undefined;
let settlingDueEvents = false;

void connectDatabase()
  .then(async () => {
    if (await Category.countDocuments() === 0) {
      await Category.insertMany([
        { name: 'General', slug: 'general', contentType: 'both' },
        { name: 'Education', slug: 'education', contentType: 'both' },
        { name: 'Science', slug: 'science', contentType: 'both' },
        { name: 'Technology', slug: 'technology', contentType: 'both' },
        { name: 'Business', slug: 'business', contentType: 'both' },
        { name: 'Entertainment', slug: 'entertainment', contentType: 'both' },
        { name: 'Lifestyle', slug: 'lifestyle', contentType: 'both' },
        { name: 'Sports', slug: 'sports', contentType: 'both' },
      ]);
      console.info('Initialized default quiz and poll categories');
    }
    await PlatformConfig.findOneAndUpdate({ _id: 'global' }, { $setOnInsert: { _id: 'global', signupBonus: env.SIGNUP_BONUS_QCOINS } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    const settleDueEvents = async () => {
      if (settlingDueEvents) return;
      settlingDueEvents = true;
      try {
        await settleDueSpecialEventPrizes();
      } catch (error) {
        console.error('Unable to process due Special Event prize settlements.', error);
      } finally {
        settlingDueEvents = false;
      }
    };
    await settleDueEvents();
    settlementTimer = setInterval(() => { void settleDueEvents(); }, 30_000);
  })
  .catch((error: unknown) => {
    console.error('MongoDB connection failed. API is running in an unavailable state until the database is configured.', error);
  });

function shutdown(signal: string) {
  console.info(`${signal} received, shutting down QuizSphere API.`);
  if (settlementTimer) clearInterval(settlementTimer);
  server.close(() => {
    void mongoose.disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
