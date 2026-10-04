import 'dotenv/config';

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const traceExporter = new OTLPTraceExporter({
  url:
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
    'http://localhost:4318/v1/traces',
});

const sdk = new NodeSDK({
  traceExporter,

  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (request) => {
          return request.url?.startsWith('/metrics') ?? false;
        },
      },
    }),
  ],
});

sdk.start();
