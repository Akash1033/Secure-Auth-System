import { Router} from "express";
import { loginUser, logoutUser, registerUser, verifyOTP, refreshAccessToken, resendOTP } from "../controllers/auth.controller.js";
import { getCurrentUser, updateAccountDetails , changeCurrentUserPassword} from "../controllers/user.controller.js";
import {verifyJWT} from "../middleware/auth.middleware.js";

const router = Router();

// Auth routes
router.route("/register").post(registerUser)
router.route("/verify-otp").post(verifyOTP)
router.route("/resend-otp").post(resendOTP)
router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

// User routes
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-account-details").patch(verifyJWT,updateAccountDetails)
router.route("/change-password").patch(verifyJWT,changeCurrentUserPassword)



export default router;