import type { Stack } from 'aws-cdk-lib';
import { CfnOutput, RemovalPolicy, aws_s3 } from 'aws-cdk-lib';

import type { StackConfig } from '../parse-stack-config.js';
import { mapS3Encryption } from '../utils/map-s3-encryption.js';

export function createBucket(stackConfig: StackConfig, stack: Stack): aws_s3.IBucket {
  const s3BucketEncryption = mapS3Encryption(stackConfig.s3, stack);

  const bucket = new aws_s3.Bucket(stack, `Bucket`, {
    ...s3BucketEncryption,
    blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
    enforceSSL: true,
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    objectOwnership: aws_s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
  });

  new CfnOutput(stack, `BucketNameOutput`, {
    value: bucket.bucketName,
  }).node.addDependency(bucket);

  return bucket;
}
