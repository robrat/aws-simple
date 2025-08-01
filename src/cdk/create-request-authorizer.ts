import type { StackConfig } from '../parse-stack-config.js';
import type { Stack } from 'aws-cdk-lib';

import { getDomainName } from '../utils/get-domain-name.js';
import { getHash } from '../utils/get-hash.js';
import { Duration, aws_apigateway, aws_lambda, aws_logs } from 'aws-cdk-lib';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

export function createRequestAuthorizer(
  stackConfig: StackConfig,
  stack: Stack,
): aws_apigateway.IAuthorizer | undefined {
  const { authentication, routes } = stackConfig;

  if (!authentication || routes.every(({ authenticationEnabled }) => !authenticationEnabled)) {
    return;
  }

  const domainName = getDomainName(stackConfig);
  const functionName = `aws-simple-request-authorizer-${getHash(domainName)}`;

  return new aws_apigateway.RequestAuthorizer(stack, `RequestAuthorizer`, {
    handler: new aws_lambda.Function(stack, `Function${getHash(functionName)}`, {
      functionName,
      code: aws_lambda.Code.fromAsset(
        join(dirname(fileURLToPath(import.meta.url)), `request-authorizer`),
      ),
      handler: `index.handler`,
      description: `https://${domainName}`,
      environment: {
        USERNAME: authentication.username,
        PASSWORD: authentication.password,
      },
      runtime: aws_lambda.Runtime.NODEJS_22_X,
      tracing: aws_lambda.Tracing.PASS_THROUGH,
      logRetention: aws_logs.RetentionDays.TWO_WEEKS,
    }),
    identitySources: [aws_apigateway.IdentitySource.header(`Authorization`)],
    resultsCacheTtl: Duration.seconds(authentication.cacheTtlInSeconds ?? 300),
  });
}
