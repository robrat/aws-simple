import {APIGatewayProxyResult} from 'aws-lambda';
import express from 'express';
import * as lambdaLocal from 'lambda-local';
import {LambdaConfig} from '../../types';
import {getRequestHeaders} from './get-request-headers';
import {logInfo} from './log-info';

export function createLambdaRequestHandler(
  lambdaConfig: LambdaConfig,
  lambdaCache: Map<string, APIGatewayProxyResult> | undefined
): express.RequestHandler {
  const {
    localPath,
    handler = 'handler',
    timeoutInSeconds = 28,
    environment,
  } = lambdaConfig;

  return async (req, res) => {
    try {
      const cachedResult = lambdaCache?.get(req.url);

      const result =
        cachedResult ||
        (await lambdaLocal.execute({
          lambdaPath: localPath,
          lambdaHandler: handler,
          timeoutMs: timeoutInSeconds * 1000,
          environment,
          event: {
            ...getRequestHeaders(req),
            path: req.path,
            httpMethod: req.method,
            queryStringParameters: req.query,
            body: req.body
              ? typeof req.body === 'string'
                ? req.body
                : JSON.stringify(req.body)
              : null,
          },
        }));

      const {headers, statusCode, body} = result;

      if (!cachedResult && statusCode === 200) {
        lambdaCache?.set(req.url, result);
      }

      if (headers) {
        for (const key of Object.keys(headers)) {
          res.set(key, String(headers[key]));
        }
      }

      if (cachedResult) {
        logInfo(`DEV server cache hit for Lambda request: ${req.url}`);
      }

      res.status(statusCode).send(body);
    } catch (error) {
      res.status(500).send(error);
    }
  };
}
