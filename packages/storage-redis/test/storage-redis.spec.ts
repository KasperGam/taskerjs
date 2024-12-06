import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { RedisStore } from '../src/redis.store';

describe(`Redis Storage`, () => {
  let container: StartedRedisContainer;

  beforeAll(async () => {
    container = await new RedisContainer().start();
  }, 60000);

  afterAll(async () => {
    await container.stop();
  }, 15000);

  it(`Can store and fetch in redis`, async () => {
    const storage = new RedisStore({
      namespace: `test`,
      host: container.getHost(),
      port: container.getPort(),
    });

    // Should not exist
    const hasKey = await storage.has(`noKey`);
    expect(hasKey).toEqual(false);

    const noKey = await storage.get(`noKey`);
    expect(noKey).toBeNull();

    // Set some data now
    await storage.set(`myKey`, `data`);

    // Expect it to exist
    const hasData = await storage.has(`myKey`);
    expect(hasData).toEqual(true);

    const data = await storage.get(`myKey`);
    expect(data).toEqual(`data`);

    // Need to disconnect the client
    storage.getClient().disconnect();
  });
});
