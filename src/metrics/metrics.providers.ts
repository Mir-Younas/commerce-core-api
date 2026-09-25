import { collectDefaultMetrics, Registry } from '@prometheus-io/client';

import { PROMETHEUS_REGISTRY } from './metrics.constants';

export const prometheusRegistryProvider = {
  provide: PROMETHEUS_REGISTRY,

  useFactory: () => {
    const prometheusRegistry = new Registry();

    collectDefaultMetrics({
      register: prometheusRegistry,
    });

    return prometheusRegistry;
  },
};
