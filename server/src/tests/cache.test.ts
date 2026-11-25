import { redisService } from '../services/redisService';

async function testCache() {
  console.log('🧪 Testing Redis Cache Service...');

  // Give socket 100ms to finish handshake
  await new Promise((r) => setTimeout(r, 150));

  const statusBefore = await redisService.getStatus();
  console.log('Cache Provider:', statusBefore.provider);
  console.log('Connected:', statusBefore.connected);

  // 1. Set key
  const testKey = 'test:coffee:grade1';
  const testPayload = { region: 'Jimma', grade: 'Specialty G1', priceETB: 380 };
  await redisService.set(testKey, testPayload, 60);
  console.log('✅ Cached payload in Redis:', testKey);

  // 2. Get key
  const retrieved = await redisService.get(testKey);
  if (retrieved && retrieved.grade === 'Specialty G1') {
    console.log('✅ Successfully retrieved from Redis:', retrieved);
  } else {
    throw new Error('Retrieved value did not match!');
  }

  // 3. Status and telemetry
  const statusAfter = await redisService.getStatus();
  console.log('Cache Stats:', statusAfter.stats);

  // 4. Wildcard pattern invalidation
  const invalidated = await redisService.delPattern('test:coffee:*');
  console.log(`✅ Invalidated ${invalidated} test keys matching pattern 'test:coffee:*'`);

  const afterDelete = await redisService.get(testKey);
  if (afterDelete === null) {
    console.log('✅ Key properly cleared following pattern invalidation');
  } else {
    throw new Error('Key should have been deleted!');
  }

  console.log('🎉 All Redis caching tests passed successfully!');
  process.exit(0);
}

testCache().catch((err) => {
  console.error('❌ Cache test failed:', err);
  process.exit(1);
});
