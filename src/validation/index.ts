/**
 * Validation Module
 *
 * Provides type compatibility checking, required field validation,
 * and full mapping validation for the MessageMapper application.
 */

// Type compatibility
export {
  TYPE_COMPATIBILITY,
  areTypesCompatible,
  inferTransformationOutputType,
  inferTypeFromValue
} from './type-compatibility'

// Required field validation
export {
  validateRequiredFields,
  flattenFields
} from './required-fields'

// Full mapping validation
export {
  validateMapping,
  type ValidationError,
  type ValidationResult
} from './validate-mapping'
