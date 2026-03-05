export const GENERIC_MUTATION_ERROR =
  "We could not process your request. Please try again.";

export function handleServerMutationError(
  context: string,
  error: unknown,
  fallbackMessage: string = GENERIC_MUTATION_ERROR,
) {
  console.error(`[${context}]`, error);

  return fallbackMessage;
}
