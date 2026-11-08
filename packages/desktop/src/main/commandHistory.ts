/**
 * Turning raw terminal input into a command worth recording.
 *
 * The terminal sends every keystroke, so the stream contains far more than
 * commands: backspaces, arrow-key escapes and pasted control sequences all
 * arrive the same way. Only a line that ends the input and carries no control
 * character is a command the user actually submitted.
 */

/** True when the string carries a control character. */
export const hasControlCharacter = (value: string): boolean => {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
};

/**
 * Extracts the command a submitted line represents, or null when the input
 * is not a command — a bare newline, an edited line with escape sequences, or
 * a control character such as Ctrl+C.
 */
export const extractSubmittedCommand = (data: string): string | null => {
  if (!data.endsWith('\n') && !data.endsWith('\r')) return null;
  const command = data.trim();
  if (!command) return null;
  if (hasControlCharacter(command)) return null;
  return command;
};
