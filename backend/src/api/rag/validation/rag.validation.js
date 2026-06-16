import Joi from "joi";

export const deleteDocumentSchema = Joi.object({
  documentId: Joi.number().integer().positive().required(),
});
