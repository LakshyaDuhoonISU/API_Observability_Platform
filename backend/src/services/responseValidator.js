/**
 * Validate API response against expected values
 */
const validateResponse = (apiDoc, result) => {
  const errors = [];

  // Validate expected HTTP status code
  if (apiDoc.expectedStatusCode && result.statusCode !== null) {
    if (result.statusCode !== apiDoc.expectedStatusCode) {
      errors.push(
        `Expected status ${apiDoc.expectedStatusCode}, got ${result.statusCode}`
      );
    }
  }

  // Validate expected JSON fields
  if (
    apiDoc.expectedJsonFields &&
    apiDoc.expectedJsonFields.length > 0 &&
    result.responseBody
  ) {
    try {
      const body =
        typeof result.responseBody === 'string'
          ? JSON.parse(result.responseBody)
          : result.responseBody;

      if (typeof body === 'object' && body !== null) {
        for (const field of apiDoc.expectedJsonFields) {
          if (!(field in body)) {
            errors.push(`Missing expected JSON field: "${field}"`);
          }
        }
      } else {
        errors.push('Response body is not a JSON object');
      }
    } catch {
      errors.push('Response body is not valid JSON');
    }
  }

  // Validate content type (expect JSON by default if expectedJsonFields are set)
  if (
    apiDoc.expectedJsonFields &&
    apiDoc.expectedJsonFields.length > 0 &&
    result.contentType
  ) {
    if (!result.contentType.includes('application/json')) {
      errors.push(
        `Expected JSON content type, got "${result.contentType}"`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

module.exports = { validateResponse };
