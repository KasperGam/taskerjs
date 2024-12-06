import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { S3Store } from '../src/s3.store';

describe(`S3 Store`, () => {
  let s3Host: string;
  let s3Port: number;
  let container: StartedTestContainer;

  beforeAll(async () => {
    container = await new GenericContainer(
      `quay.io/minio/minio:RELEASE.2024-11-07T00-52-20Z`,
    )
      .withExposedPorts(9000)
      .withExposedPorts(9001)
      .withEnvironment({
        MINIO_ROOT_USER: `root_user`,
        MINIO_ROOT_PASSWORD: `root_password`,
      })
      .withCommand([`server`, `/data`, `--console-address`, `:9001`])
      .withWaitStrategy(Wait.forHttp(`/minio/health/live`, 9000))
      .start();

    s3Host = container.getHost();
    s3Port = container.getMappedPort(9000);
  }, 60000);

  afterAll(async () => {
    await container?.stop();
  }, 15000);

  it(`Container runs`, () => {
    expect(container).toBeDefined();
  });

  it(`S3 store can set and get data`, async () => {
    const endpoint = `http://${s3Host}:${s3Port}`;
    const store = new S3Store({
      credentials: {
        accessKeyId: `root_user`,
        secretAccessKey: `root_password`,
      },
      bucketName: `test`,
      endpoint,
      region: `us-east-1`,
      forcePathStyle: true,
    });

    const hasBase = await store.has(`test_path`);
    expect(hasBase).toEqual(false);

    await store.set(
      `test_path`,
      JSON.stringify({ test: true, hello: 'there' }),
    );
    const data = await store.get(`test_path`);
    expect(data).not.toBeNull();
    expect(JSON.parse(data)).toEqual(
      expect.objectContaining({ test: true, hello: 'there' }),
    );
  }, 15000);
});
