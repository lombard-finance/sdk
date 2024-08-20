/**
 * @param functionName - The name of the function.
 * @returns The meta title in the format "SDK/{functionName}".
 */
export function getMetaTitle(functionName: string): string {
  return `SDK/${functionName}`;
}
