import {APIGatewayProxyResult} from 'aws-lambda';
import express from 'express';
import lambdaLocal from 'lambda-local';
import {LambdaConfig} from '../../types';
import {getRequestHeaders} from './get-request-headers';

export function createLambdaRequestHandler(
  port: number,
  lambdaConfig: LambdaConfig,
  useCache: boolean
): express.RequestHandler {
  const cachedResults = new Map<string, APIGatewayProxyResult>();

  const {
    localPath,
    handler = 'handler',
    timeoutInSeconds = 30,
    cachingEnabled,
    getEnvironment
  } = lambdaConfig;

  return async (req, res) => {
    try {
      const result =
        cachedResults.get(req.url) ||
        (await lambdaLocal.execute({
          lambdaPath: localPath,
          lambdaHandler: handler,
          timeoutMs: timeoutInSeconds * 1000,
          environment: getEnvironment && getEnvironment(port),
          event: {
            ...getRequestHeaders(req),
            path: req.path,
            queryStringParameters: req.query
          }
        }));

      const {headers, statusCode, body} = result;

      if (useCache && cachingEnabled && statusCode === 200) {
        cachedResults.set(req.url, result);
      }

      if (headers) {
        for (const key of Object.keys(headers)) {
          res.set(key, String(headers[key]));
        }
      }

      res.status(statusCode).send(body);
    } catch (error) {
      res.status(500).send(error);
    }
  };
}