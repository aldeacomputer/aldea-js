/**
 * Config interface
 */
export interface Config {
  // Paths
  codeDir: string;
  walletDir: string;

  // Node
  nodeUrl: string;
}

/**
 * Default config
 */
export const defaultConfig: Config = {
  codeDir: '.',
  walletDir: '.aldea',
  //nodeUrl: 'https://node.aldea.network',
  nodeUrl: 'http://localhost:4000',
}
