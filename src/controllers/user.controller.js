import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { generateOTP } from "../utils/otpGenerator.js";


const getCurrentUser = asyncHandler(async(req,res) =>{
    return res
    .status(200)
    .json(new ApiResponse(200, req.user ,"Current User Fetched Successfully"))
});


const updateAccountDetails = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  // At least one field must be provided
  if (!name && !email) {
    throw new ApiError(400, "At least one field is required");
  }

  const updateData = {};

  if (name) updateData.name = name;

  if (email && email !== req.user.email) {
    updateData.email = email;
    updateData.isVerified = false;
    updateData.otp = generateOTP();
    updateData.otpExpiry = Date.now() + 5 * 60 * 1000;
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateData },
    { new: true }
  ).select("-password -refreshToken -otp -otpExpiry");

  return res.status(200).json(
    new ApiResponse(200, user, "Account details updated successfully")
  );
});

const changeCurrentUserPassword = asyncHandler(async (req, res) => {
    
    const { oldPassword, newPassword } = req.body;

    // 1. Validate fields
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old password and new password are required");
    }

    // 2. Get user
    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // 3. Check old password
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    // 4. Prevent using same password again
    const isSamePassword = await user.isPasswordCorrect(newPassword);
    if (isSamePassword) {
        throw new ApiError(400, "New password cannot be the same as old password");
    }

    // 5. Update password (hashing happens automatically)
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});




export {getCurrentUser , updateAccountDetails , changeCurrentUserPassword}