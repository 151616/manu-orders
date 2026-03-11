export const GENERIC_MUTATION_ERROR =
  "We could not process your request. Please try again.";

function createErrorReference(context: string) {
  const normalizedContext = context.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `${normalizedContext}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function handleServerMutationError(
  context: string,
  error: unknown,
  fallbackMessage: string = GENERIC_MUTATION_ERROR,
) {
  const errorReference = createErrorReference(context);
  console.error(`[${context}] [ref:${errorReference}]`, error);

  return `${fallbackMessage} (ref: ${errorReference})`;
}
