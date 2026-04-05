import { BadRequestException } from '@nestjs/common';

const HTML_TAG_REGEX = /<[^>]*>/g;

export function sanitizeTextInput(value: string): string {
  return value.replace(HTML_TAG_REGEX, '').replace(/\s+/g, ' ').trim();
}

export function sanitizeNullableTextInput(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  const sanitized = sanitizeTextInput(value);
  return sanitized.length > 0 ? sanitized : null;
}

export function requireSanitizedText(
  value: string,
  fieldName: string,
): string {
  const sanitized = sanitizeTextInput(value);
  if (!sanitized) {
    throw new BadRequestException(`${fieldName} cannot be empty`);
  }
  return sanitized;
}

