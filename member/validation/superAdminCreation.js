const Joi = require("joi");

const superAdminCreationValidation = Joi.object({
  name: Joi.string().required(),
  role: Joi.string(),
  email: Joi.string().required(),
  mobile: Joi.string().required(),
  password: Joi.string().required()
  
});

module.exports = superAdminCreationValidation;
  
  