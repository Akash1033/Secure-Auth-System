import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";



// export const verifyJWT = asyncHandler(async(req,res,next) => {
//     try {
//         const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        
//         if(!token){
//             throw new ApiError(401 , "Unauthorized request")
//         }
    
//         const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
//         const user = await User.findById(decodedToken?._id).select("-password -refreshToken -otp -otpExpiry")
    
//         if(!user){
//             throw new ApiError(401,"Invaild Access Token")
//         }
    
//         req.user = user;
//         next()
//     } catch (error) {
//         throw new ApiError(401,error?.message  || "invalid access token")
//     }

// })

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // 1. Extract Bearer token
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Unauthorized request");
    }

    const token = authHeader.split(" ")[1];

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // 3. Get user
    const user = await User.findById(decoded._id).select(
      "-password -refreshToken -otp -otpExpiry"
    );

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    // 4. Attach user to req
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error.message || "Invalid access token");
  }
});
