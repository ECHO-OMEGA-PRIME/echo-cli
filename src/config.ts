/**
 * Echo CLI Configuration — API keys, endpoints, defaults.
 * Stored at ~/.echo-prime/config.json via `conf` package.
 */
import Conf from 'conf';

export interface EchoConfig {
  apiKey: string;
  gatewayUrl: string;
  defaultDomain: string;
  defaultPersonality: string;
  outputFormat: 'json' | 'table' | 'text';
  verbose: boolean;
}

const DEFAULT_CONFIG: EchoConfig = {
  apiKey: '',
  gatewayUrl: 'https://echo-sdk-gateway.bmcii1976.workers.dev',
  defaultDomain: 'general',
  defaultPersonality: 'echo_prime',
  outputFormat: 'text',
  verbose: false,
};

export const config = new Conf<EchoConfig>({
  projectName: 'echo-prime',
  defaults: DEFAULT_CONFIG,
});

export function getApiKey(): string {
  const envKey = process.env.ECHO_API_KEY;
  if (envKey) return envKey;
  const confKey = config.get('apiKey');
  if (confKey) return confKey;
  return '';
}

export function getGatewayUrl(): string {
  return process.env.ECHO_GATEWAY_URL || config.get('gatewayUrl');
}

export function requireApiKey(): string {
  const key = getApiKey();
  if (!key) {
    console.error('No API key configured. Run: echo config set apiKey <your-key>');
    console.error('Or set ECHO_API_KEY environment variable.');
    process.exit(1);
  }
  return key;
}
