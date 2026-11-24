export class AppError extends Error {
  constructor(message: string, public code: string = 'APP_ERROR', public details?: Record<string, any>) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class ScanError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'SCAN_ERROR', details);
    this.name = 'ScanError';
  }
}

export class PermissionError extends AppError {
  constructor(message: string = 'User is not permitted to perform this action') {
    super(message, 'PERMISSION_DENIED');
    this.name = 'PermissionError';
  }
}
