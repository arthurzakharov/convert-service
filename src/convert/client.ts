import ConvertSDK from '@convertcom/js-sdk';
import type { ConvertInterface, ConvertConfig } from '@convertcom/js-sdk';

export type ProjectKey = 'passexperten' | 'bussgeldcheck';

interface ProjectConfig {
  sdkKey: string;
  sdkKeySecret?: string;
}

const PROJECT_CONFIGS: Record<ProjectKey, ProjectConfig> = {
  passexperten: {
    sdkKey: process.env.CONVERT_SDK_KEY_PASSEXPERTEN ?? '',
  },
  bussgeldcheck: {
    sdkKey: process.env.CONVERT_SDK_KEY_BUSSGELDCHECK ?? '',
  },
};

const clients = new Map<ProjectKey, ConvertInterface>();
const readyPromises = new Map<ProjectKey, Promise<void>>();

function buildConfig(project: ProjectConfig): ConvertConfig {
  return {
    sdkKey: project.sdkKey,
    ...(project.sdkKeySecret ? { sdkKeySecret: project.sdkKeySecret } : {}),
    environment: (process.env.CONVERT_ENVIRONMENT ?? 'production') as string,
    dataRefreshInterval: Number(process.env.CONVERT_DATA_REFRESH_INTERVAL ?? 300_000),
    logger: {
      logLevel: process.env.NODE_ENV === 'development' ? 3 : 1,
    },
  } as ConvertConfig;
}

/**
 * Return the SDK client for a project, initializing it on first call.
 * Throws if sdkKey is not configured for the project.
 */
export async function getClient(projectKey: ProjectKey): Promise<ConvertInterface> {
  if (!clients.has(projectKey)) {
    const config = PROJECT_CONFIGS[projectKey];
    if (!config.sdkKey) {
      throw new Error(`No SDK key configured for project: ${projectKey}`);
    }

    // ConvertSDK is typed as CoreInterface but ConvertInterface = CoreInterface
    const sdk = new ConvertSDK(buildConfig(config)) as unknown as ConvertInterface;
    const ready = (sdk as any).onReady() as Promise<void>;
    clients.set(projectKey, sdk);
    readyPromises.set(projectKey, ready);
  }

  await readyPromises.get(projectKey);
  return clients.get(projectKey)!;
}

/**
 * Pre-warm all configured SDK clients at startup.
 * Projects with missing SDK keys are skipped with a warning.
 */
export async function initAllClients(): Promise<void> {
  const projects = Object.keys(PROJECT_CONFIGS) as ProjectKey[];
  await Promise.allSettled(
    projects.map(async (key) => {
      if (!PROJECT_CONFIGS[key].sdkKey) {
        console.warn(`[convert] Skipping ${key}: CONVERT_SDK_KEY_${key.toUpperCase()} not set`);
        return;
      }
      await getClient(key);
      console.log(`[convert] SDK ready for project: ${key}`);
    }),
  );
}
