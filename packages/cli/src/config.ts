/**
 * TODO
 */
export interface Config {
  // Paths
  codeDir: string;
  walletDir: string;

  // Node
  nodeUrl: string;
}

/**
 * TODO
 */
export const defaultConfig: Config = {
  codeDir: '.',
  walletDir: '.aldea',
  //nodeUrl: 'https://node.aldea.computer',
  nodeUrl: 'http://localhost:4000',
}
