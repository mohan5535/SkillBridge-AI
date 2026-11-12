import { AppError } from './AppError.js';
import { HTTP_STATUS } from '../constants/httpCodes.js';

export class ValidationError extends AppError {
  constructor(message = 'Validation failed for request parameters or payload', errors = []) {
    super(message, HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

