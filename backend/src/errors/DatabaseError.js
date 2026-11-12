import { AppError } from './AppError.js';
import { HTTP_STATUS } from '../constants/httpCodes.js';

export class DatabaseError extends AppError {
  constructor(message = 'A database error occurred', originalError = null) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR');
    if (originalError) {
      this.pgCode = originalError.code;
      this.detail = originalError.detail;
      this.constraint = originalError.constraint;
    }
  }
}

