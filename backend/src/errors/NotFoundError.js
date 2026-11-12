import { AppError } from './AppError.js';
import { HTTP_STATUS } from '../constants/httpCodes.js';

export class NotFoundError extends AppError {
  constructor(message = 'Requested resource was not found') {
    super(message, HTTP_STATUS.NOT_FOUND, 'RESOURCE_NOT_FOUND');
  }
}

