import { describe, expect, test } from '@jest/globals';

import { mapS3Encryption } from './map-s3-encryption.js';
import { aws_s3, Stack } from 'aws-cdk-lib';

describe(`mapS3Encryption()`, () => {
  test(`returns S3_MANAGED encryption when no encryption is provided`, () => {
    const result = mapS3Encryption(undefined as any, {} as Stack);
    expect(result).toEqual({ encryption: aws_s3.BucketEncryption.S3_MANAGED });
  });

  test(`returns S3_MANAGED encryption when S3_MANAGED is provided`, () => {
    const result = mapS3Encryption({ encryption: 'S3_MANAGED' }, {} as Stack);
    expect(result).toEqual({ encryption: aws_s3.BucketEncryption.S3_MANAGED });
  });

  test(`returns KMS_MANAGED encryption when KMS_MANAGED is provided`, () => {
    const result = mapS3Encryption({ encryption: 'KMS_MANAGED' }, {} as Stack);
    expect(result).toEqual({
      encryption: aws_s3.BucketEncryption.KMS_MANAGED,
      bucketKeyEnabled: true,
    });
  });

  test(`returns KMS_MANAGED encryption with bucketKeyEnabled when KMS_MANAGED and bucketKeyEnabled are provided`, () => {
    const result = mapS3Encryption(
      { encryption: 'KMS_MANAGED', bucketKeyEnabled: false },
      {} as Stack,
    );
    expect(result).toEqual({
      encryption: aws_s3.BucketEncryption.KMS_MANAGED,
      bucketKeyEnabled: false,
    });
  });

  test(`returns KMS encryption with key when KMS and encryptionKeyArn are provided`, () => {
    const stack = new Stack();
    expect(Stack.isStack(stack)).toBeTruthy();

    const keyArn = 'arn:aws:kms:region:account-id:key/key-id';
    const result = mapS3Encryption({ encryption: 'KMS', encryptionKeyArn: keyArn }, stack);
    expect(result.encryption).toEqual(aws_s3.BucketEncryption.KMS);
    expect(result.encryptionKey).toBeDefined();
  });

  test(`returns KMS encryption without key when KMS is provided without encryptionKeyArn`, () => {
    const result = mapS3Encryption({ encryption: 'KMS' }, {} as Stack);
    expect(result).toEqual({
      encryption: aws_s3.BucketEncryption.KMS,
      encryptionKey: undefined,
      bucketKeyEnabled: true,
    });
  });

  test(`returns KMS encryption with bucketKeyEnabled when KMS, bucketKeyEnabled and encryptionKeyArn are provided`, () => {
    const stack = new Stack();
    expect(Stack.isStack(stack)).toBeTruthy();

    const keyArn = 'arn:aws:kms:region:account-id:key/key-id';
    const result = mapS3Encryption(
      { encryption: 'KMS', encryptionKeyArn: keyArn, bucketKeyEnabled: false },
      stack,
    );
    expect(result).toEqual({
      encryption: aws_s3.BucketEncryption.KMS,
      encryptionKey: expect.any(Object),
      bucketKeyEnabled: false,
    });
  });

  test(`throws an error for unsupported encryption types`, () => {
    expect(() => mapS3Encryption({ encryption: 'UNSUPPORTED' } as any, {} as Stack)).toThrow(
      'Unsupported encryption type',
    );
  });
});
