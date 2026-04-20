/**
 * Convert a camelCase string to readable string with spaces.
 *
 * @param value - CamelCase string.
 *
 * @returns Readable string with spaces.
 */
export function fromCamelCase(value: string): string {
  return (
    value
      // Insert a space before all caps
      .replace(/([A-Z])/g, ' $1')
      // Uppercase the first character
      .replace(/^./, str => str.toUpperCase())
  );
}
