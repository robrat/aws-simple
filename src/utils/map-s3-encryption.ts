import type { S3BucketEncryption } from '../parse-stack-config.js';

import { aws_s3, aws_kms, type Stack } from 'aws-cdk-lib';

export type BucketEncryption = {
  encryption: aws_s3.BucketEncryption;
  encryptionKey?: aws_kms.IKey;
  bucketKeyEnabled?: boolean;
};

export function mapS3Encryption(s3encryption: S3BucketEncryption, stack: Stack): BucketEncryption {
  if (!s3encryption || s3encryption.encryption === `S3_MANAGED`) {
    return { encryption: aws_s3.BucketEncryption.S3_MANAGED };
  }

  const bucketKeyEnabled = s3encryption.bucketKeyEnabled ?? true;

  if (s3encryption.encryption === `KMS_MANAGED`) {
    return { encryption: aws_s3.BucketEncryption.KMS_MANAGED, bucketKeyEnabled };
  }

  if (s3encryption.encryption === `KMS`) {
    let encryptionKey: aws_kms.IKey | undefined = undefined;

    if (s3encryption.encryptionKeyArn) {
      encryptionKey = aws_kms.Key.fromKeyArn(
        stack,
        `S3EncryptionKey`,
        s3encryption.encryptionKeyArn,
      );
    }
    return { encryptionKey, encryption: aws_s3.BucketEncryption.KMS, bucketKeyEnabled };
  }

  throw new Error(`Unsupported encryption type`);
}
