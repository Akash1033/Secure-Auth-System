import Joi from "joi";

const  registerSchema = Joi.object({
    name : Joi.string().min(3).max(20).required(),
    email : Joi.string().email({minDomainSegments : 2}).required(),
    password : Joi.string().min(8).max(20).required(),
})

export {registerSchema};
