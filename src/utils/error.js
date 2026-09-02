// Custom error class for API errors
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Function to create an error with status code and message
exports.createError = (statusCode, message) => {
  return new ApiError(statusCode, message);
};

// Function to handle 404 errors
exports.createNotFoundError = (resource) => {
  return new ApiError(404, `${resource} not found`);
};

// Function to handle validation errors
exports.createValidationError = (errors) => {
  return new ApiError(400, 'Validation Error', errors);
};

// Function to handle unauthorized errors
exports.createUnauthorizedError = (message = 'Unauthorized access') => {
  return new ApiError(401, message);
};

// Function to handle forbidden errors
exports.createForbiddenError = (message = 'Forbidden access') => {
  return new ApiError(403, message);
};

module.exports.ApiError = ApiError; 