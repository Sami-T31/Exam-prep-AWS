/**
 * Standard API error response format.
 * All API errors follow this structure so the frontend
 * can display consistent error messages.
 */
export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}

/**
 * Paginated response wrapper.
 * All list endpoints return data in this format.
 * - data: the actual items for the current page
 * - total: total number of items matching the query
 * - limit: how many items per page
 * - offset: how many items were skipped
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Query parameters for paginated list endpoints.
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Bookmark - a saved question for later review.
 */
export interface Bookmark {
  id: string;
  userId: string;
  questionId: string;
  createdAt: string;
}
