import type { PostgrestError } from '@supabase/supabase-js';

const CustomPostgreSqlErrorCode = {
  CATEGORIES_LIMIT: 'P1001',
  DAILY_ACTIVITIES_LIMIT: 'P1002',
} as const;
export type CustomPostgreSqlErrorCodeType = (typeof CustomPostgreSqlErrorCode)[keyof typeof CustomPostgreSqlErrorCode];

const PostgreSqlErrorCode = {
  UNIQUE_VIOLATION: '23505',
  NOT_NULL_VIOLATION: '23502',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
} as const;

export type PostgreSqlErrorCodeType = (typeof PostgreSqlErrorCode)[keyof typeof PostgreSqlErrorCode];

export function isApiError(error: unknown): error is PostgrestError {
  if (typeof error !== 'object' || error === null || !('code' in error) || typeof error.code !== 'string') {
    return false;
  }
  return 'message' in error && 'details' in error;
}

function isCustomApiError(error: unknown): boolean {
  if (isApiError(error)) {
    return Object.values(CustomPostgreSqlErrorCode).includes(error.code as CustomPostgreSqlErrorCodeType);
  }
  return false;
}

export function getFriendlyErrorTranslationLabel(error: unknown): string {
  if (!isApiError(error)) {
    console.error('Not a PostgREST error occurred', error);

    return 'app.api_error.network_failure';
  }

  if (isCustomApiError(error)) {
    console.error('Custom PostgREST error occurred', error);

    switch (error.code) {
      case CustomPostgreSqlErrorCode.DAILY_ACTIVITIES_LIMIT:
        return 'app.api_error.daily_limit_reached';
      case CustomPostgreSqlErrorCode.CATEGORIES_LIMIT:
        return 'app.api_error.categories_limit_reached';
    }
  }

  switch (error.code) {
    case PostgreSqlErrorCode.UNIQUE_VIOLATION:
      console.error('PostgREST error occurred (UNIQUE_VIOLATION)', error);

      return 'app.api_error.unique_violation';
    case PostgreSqlErrorCode.NOT_NULL_VIOLATION:
      console.error('PostgREST error occurred (NOT_NULL_VIOLATION)', error);

      return 'app.api_error.not_null_violation';
    case PostgreSqlErrorCode.FOREIGN_KEY_VIOLATION:
      console.error('PostgREST error occurred (FOREIGN_KEY_VIOLATION)', error);

      return 'app.api_error.foreign_key_violation';
    case PostgreSqlErrorCode.CHECK_VIOLATION:
      console.error('PostgREST error occurred (CHECK_VIOLATION)', error);

      return 'app.api_error.check_violation';
    default:
      console.error('Unexpected error occurred', error);
      return 'app.api_error.unexpected';
  }
}
