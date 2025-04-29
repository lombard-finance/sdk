/**
 * Get the meta title for a story
 * @param functionName The name of the function
 * @returns The meta title
 */
export function getMetaTitle(functionName: string): string {
  return `SDK Solana/${functionName}`;
}

export default getMetaTitle;