import {APIGatewayProxyResult} from 'aws-lambda';
import {watch} from 'chokidar';
import compression from 'compression';
import express from 'express';
import getPort from 'get-port';
import {AppConfig, LambdaConfig} from '../types';
import {resolveS3FileConfigs} from '../utils/resolve-s3-file-configs';
import {logInfo} from './utils/log-info';
import {registerLambdaRoute} from './utils/register-lambda-route';
import {registerS3Route} from './utils/register-s3-route';
import {removeAllRoutes} from './utils/remove-all-routes';
import {sortS3FileConfigs} from './utils/sort-s3-file-configs';
import {suppressLambdaResultLogging} from './utils/suppress-lambda-result-logging';

export interface DevServerInit {
  readonly appConfig: AppConfig;
  readonly requestedPort: number;
  readonly useCache: boolean;
  readonly verbose: boolean;
}

export async function startDevServer(init: DevServerInit): Promise<void> {
  const {appConfig, requestedPort, useCache, verbose} = init;

  if (!verbose) {
    suppressLambdaResultLogging();
  }

  const app = express();

  app.use(express.text());

  const port = await getPort({port: requestedPort});
  const stackConfig = appConfig.createStackConfig(port);

  const {
    minimumCompressionSizeInBytes,
    lambdaConfigs = [],
    s3Configs = [],
    enableCors = false,
  } = stackConfig;

  if (typeof minimumCompressionSizeInBytes === 'number') {
    app.use(compression({threshold: minimumCompressionSizeInBytes}));
  }

  const lambdaCaches = useCache
    ? new WeakMap<LambdaConfig, Map<string, APIGatewayProxyResult>>()
    : undefined;

  for (const lambdaConfig of lambdaConfigs) {
    if (lambdaCaches && lambdaConfig.cachingEnabled) {
      lambdaCaches.set(lambdaConfig, new Map());

      logInfo(
        `Initialized DEV server cache for Lambda: ${lambdaConfig.localPath}`
      );
    }

    registerLambdaRoute(app, lambdaConfig, lambdaCaches?.get(lambdaConfig));
  }

  for (const s3FileConfig of sortS3FileConfigs(
    resolveS3FileConfigs(s3Configs)
  )) {
    registerS3Route(app, s3FileConfig, enableCors);
  }

  app.listen(port, () => {
    logInfo(`Started DEV server: http://localhost:${port}`);

    const localPaths = [...lambdaConfigs, ...s3Configs].map(
      ({localPath}) => localPath
    );

    watch(localPaths).on('change', (changedLocalPath) => {
      removeAllRoutes(app);

      const changedLambdaConfig = lambdaConfigs.find(
        ({localPath}) => localPath === changedLocalPath
      );

      if (lambdaCaches && changedLambdaConfig?.cachingEnabled) {
        lambdaCaches.set(changedLambdaConfig, new Map());

        logInfo(
          `Invalidated DEV server cache for Lambda: ${changedLambdaConfig.localPath}`
        );
      }

      for (const lambdaConfig of lambdaConfigs) {
        registerLambdaRoute(app, lambdaConfig, lambdaCaches?.get(lambdaConfig));
      }

      for (const s3FileConfig of sortS3FileConfigs(
        resolveS3FileConfigs(s3Configs)
      )) {
        registerS3Route(app, s3FileConfig, enableCors);
      }

      logInfo('Reregistered DEV server routes.');
    });
  });
}
