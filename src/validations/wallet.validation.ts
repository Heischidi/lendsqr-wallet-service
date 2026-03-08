import Joi from 'joi';

export const fundAccountValidationSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be greater than zero',
    'number.precision': 'Amount can have at most 2 decimal places',
    'any.required': 'Amount is required',
  }),
  description: Joi.string().max(255).optional().messages({
    'string.max': 'Description cannot exceed 255 characters',
  }),
});

export const transferValidationSchema = Joi.object({
  recipientEmail: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid recipient email address',
    'any.required': 'Recipient email is required',
  }),
  amount: Joi.number().positive().precision(2).required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be greater than zero',
    'number.precision': 'Amount can have at most 2 decimal places',
    'any.required': 'Amount is required',
  }),
  description: Joi.string().max(255).optional().messages({
    'string.max': 'Description cannot exceed 255 characters',
  }),
});

export const withdrawalValidationSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be greater than zero',
    'number.precision': 'Amount can have at most 2 decimal places',
    'any.required': 'Amount is required',
  }),
  description: Joi.string().max(255).optional().messages({
    'string.max': 'Description cannot exceed 255 characters',
  }),
  bankAccount: Joi.string().when('$requireBankDetails', {
    is: true,
    then: Joi.required().messages({
      'any.required': 'Bank account is required for withdrawal',
    }),
    otherwise: Joi.optional(),
  }),
  bankCode: Joi.string().when('$requireBankDetails', {
    is: true,
    then: Joi.required().messages({
      'any.required': 'Bank code is required for withdrawal',
    }),
    otherwise: Joi.optional(),
  }),
});
