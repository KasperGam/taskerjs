import { Store } from '@optask/tasker';
import path from 'path';
import {
  CreateBucketCommand,
  CreateBucketCommandInput,
  GetObjectCommand,
  GetObjectCommandInput,
  HeadBucketCommand,
  HeadBucketCommandInput,
  HeadObjectCommand,
  HeadObjectCommandInput,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
  S3ClientConfig,
} from '@aws-sdk/client-s3';

export interface S3StoreOptions extends S3ClientConfig {
  basePath?: string;
  bucketName: string;
}

export class S3Store implements Store {
  private client: S3Client;
  constructor(private readonly options: S3StoreOptions) {}

  async has(key: string): Promise<boolean> {
    const ensure = await this.ensureBucket();
    if (!ensure) {
      throw new Error(`Failed to check bucket exists!`);
    }
    const client = this.getClient();

    const input: HeadObjectCommandInput = {
      Bucket: this.options.bucketName,
      Key: this.getFullPath(key),
    };
    const getObject = new HeadObjectCommand(input);

    try {
      await client.send(getObject);
      return true;
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    const ensure = await this.ensureBucket();
    if (!ensure) {
      throw new Error(`Failed to check bucket exists!`);
    }
    const client = this.getClient();

    const input: GetObjectCommandInput = {
      Bucket: this.options.bucketName,
      Key: this.getFullPath(key),
    };
    const getObject = new GetObjectCommand(input);

    try {
      const data = await client.send(getObject);
      return data.Body.transformToString(`utf-8`);
    } catch {
      return null;
    }
  }

  async set(key: string, data: string) {
    const ensure = await this.ensureBucket();
    if (!ensure) {
      throw new Error(`Failed to check bucket exists!`);
    }

    const client = this.getClient();
    const input: PutObjectCommandInput = {
      Bucket: this.options.bucketName,
      Key: this.getFullPath(key),
      Body: data,
      ContentEncoding: `utf-8`,
    };
    const putObject = new PutObjectCommand(input);

    await client.send(putObject);
  }

  getClient() {
    if (!this.client) {
      this.client = new S3Client(this.options);
    }
    return this.client;
  }

  private async ensureBucket(): Promise<boolean> {
    const client = this.getClient();
    const bucket = this.options.bucketName;

    try {
      const input: HeadBucketCommandInput = {
        Bucket: bucket,
      };
      const command = new HeadBucketCommand(input);
      await client.send(command);
      return true;
    } catch {
      try {
        const input: CreateBucketCommandInput = {
          Bucket: bucket,
        };
        const command = new CreateBucketCommand(input);
        await client.send(command);
        return true;
      } catch (e) {
        console.error(
          `Error creating bucket ${bucket}! ${e instanceof Error ? e.message : e}`,
        );
        return false;
      }
    }
  }

  private getFullPath(key: string): string {
    const basePath = key.replace(`_`, `/`);
    const file = path.basename(basePath) + `.json`;

    const parts = [path.dirname(basePath), file];
    if (this.options.basePath) {
      parts.unshift(this.options.basePath);
    }

    const fullPath = path.join(...parts);

    return fullPath;
  }
}
