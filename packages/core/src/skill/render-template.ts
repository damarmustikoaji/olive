/** Replaces {{key}} placeholders with values from data. Missing keys are left as-is. */
export function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    return key in data ? String(data[key]) : match;
  });
}
