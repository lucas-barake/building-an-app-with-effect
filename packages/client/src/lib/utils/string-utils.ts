import * as Array from "effect/Array";
import { flow, pipe } from "effect/Function";
import * as Option from "effect/Option";
import * as EString from "effect/String";

/**
 * Generates initials from a given name.
 *
 * @param {string | null | undefined} name - The name to generate initials from.
 * @returns {string} The initials (up to 2 characters) derived from the name, or "?" if the input is null, undefined, or empty.
 * @example
 * getNameInitials("John Doe") // Returns "JD"
 * getNameInitials("Alice") // Returns "A"
 * getNameInitials(null) // Returns "?"
 */
export const getNameInitials = (name: string | null | undefined): string => {
  return pipe(
    name === "" ? null : name,
    Option.fromNullable,
    Option.map(
      flow(
        EString.split(" "),
        Array.filter((word) => word.length > 0),
        Array.take(2),
        Array.map((word) => word[0]?.toUpperCase() ?? ""),
        Array.join(""),
      ),
    ),
    Option.getOrElse(() => "?"),
  );
};

/**
 * Normalizes a string by removing diacritics, converting to lowercase, and performing additional normalization.
 * This function is useful for creating searchable or comparable versions of strings,
 * especially when dealing with text that may contain special characters or accents.
 *
 * @param {string} str - The input string to be normalized.
 * @returns {string} The normalized string.
 *
 * @example
 * normalizeString("Año") // Returns "ano"
 * normalizeString("Café") // Returns "cafe"
 * normalizeString("Größe") // Returns "grosse"
 */
export const normalizeString = flow(
  EString.normalize("NFKD"),
  EString.replace(/[\u0300-\u036f]/g, ""), // Remove combining diacritical marks
  EString.toLowerCase,
  EString.replace(/[æœ]/g, "ae"),
  EString.replace(/ø/g, "o"),
  EString.replace(/ß/g, "ss"),
);

/**
 * Formats the message by replacing double newlines with a space and removing asterisks around words.
 *
 * @param {string} message - The message to format.
 * @returns {string} The formatted message.
 * @example
 * stripMessageFormatting("Hello\\n\\nWorld") // Returns "Hello World"
 * stripMessageFormatting("*Hello* World") // Returns "Hello World"
 */
export const stripMessageFormatting = flow(
  EString.replace(/\\n\\n/g, " "),
  EString.replace(/\*(.*?)\*/g, "$1"),
);

/**
 * Interpolates variables in a template string using handlebars-style syntax.
 * Replaces patterns like {{variable.path}} with actual values from the provided data object.
 * Supports nested object access and array indexing with bracket notation (e.g., {{items.[0].name}}).
 *
 * @param {string} template - The template string containing variable placeholders in {{variable}} format.
 * @param {Record<string, unknown>} data - The data object containing values to interpolate.
 * @returns {string} The template string with variables replaced by their corresponding values.
 *
 * @example
 * const data = {
 *   user: { name: "John" },
 *   items: [{ product: { name: "Widget" } }],
 *   total: 99.99
 * };
 * interpolateTemplate("Hello {{user.name}}, your {{items.[0].product.name}} costs ${{total}}", data)
 * // Returns "Hello John, your Widget costs $99.99"
 *
 * @example
 * interpolateTemplate("Welcome {{user.firstName}}!", { user: { firstName: "Alice" } })
 * // Returns "Welcome Alice!"
 *
 * @example
 * // Variables not found in data are left unchanged
 * interpolateTemplate("Hello {{unknown.var}}", {})
 * // Returns "Hello {{unknown.var}}"
 */
export const interpolateTemplate = (template: string, data: Record<string, unknown>): string => {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, variablePath: string) => {
    const trimmedPath = variablePath.trim();
    const value = getNestedValue(data, trimmedPath);
    return value !== undefined ? String(value) : match;
  });
};

/**
 * Safely extracts a nested value from an object using a dot-notation path.
 * Supports array indexing with bracket notation (e.g., "items.[0].name").
 *
 * @param {Record<string, unknown>} obj - The object to extract the value from.
 * @param {string} path - The dot-notation path to the desired value (e.g., "user.profile.name" or "items.[0].id").
 * @returns {unknown} The value at the specified path, or undefined if not found.
 *
 * @example
 * const data = { user: { profile: { name: "John" } }, items: [{ id: 1 }] };
 * getNestedValue(data, "user.profile.name") // Returns "John"
 * getNestedValue(data, "items.[0].id") // Returns 1
 * getNestedValue(data, "nonexistent.path") // Returns undefined
 */
export const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    // Handle array notation like [0], [1], etc.
    if (part.startsWith("[") && part.endsWith("]")) {
      const index = parseInt(part.slice(1, -1));
      if (Array.isArray(current) && index >= 0 && index < current.length) {
        current = current[index];
      } else {
        return undefined;
      }
    } else if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
};
