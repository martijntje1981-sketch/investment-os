const NEWS_GLANCE_PROHIBITED_PATTERNS: RegExp[] = [
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bhold\b/i,
  /\boverweight\b/i,
  /\bunderweight\b/i,
  /\bbecause\b/i,
  /\byou should\b/i,
  /\bwill cause\b/i,
  /\bwill fall\b/i,
  /\bwill rise\b/i,
];

export function assertNoNewsGlanceAdvisoryLanguage(texts: string[]): void {
  const blob = texts.join("\n");
  for (const pattern of NEWS_GLANCE_PROHIBITED_PATTERNS) {
    if (pattern.test(blob)) {
      throw new Error(
        `News glance advisory language detected (${pattern}): ${blob}`,
      );
    }
  }
}
