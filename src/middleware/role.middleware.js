import { ApiError } from "../utils/apiError.js";

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, "Access Denied: Admin Only");
    }

    next();
  };
};
