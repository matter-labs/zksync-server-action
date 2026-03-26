export class ActionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ActionError";
  }
}

export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

export function formatError(error: unknown): string {
  const resolved = toError(error);
  const lines = [resolved.message];

  if (resolved.stack) {
    const stackLines = resolved.stack.split("\n").slice(1, 6).map((line) => line.trim());
    if (stackLines.length > 0) {
      lines.push(stackLines.join("\n"));
    }
  }

  return lines.filter(Boolean).join("\n");
}
