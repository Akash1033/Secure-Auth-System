import { registerSchema } from "../validator/user.validator.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { generateOTP } from "../utils/otpGenerator.js";
import { sendEmail } from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})

        return {accessToken,refreshToken}


    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message);
  }
  const { name, email, password } = value;

  // if(!value || Object.keys(value).length === 0){
  //    throw new ApiError(400,"Feilds are required to register")
  // }  // i do not have need to write this line of code becuase joi already check for data is empty or not.

  const existedUser = await User.findOne({
    $or: [{ email }, { name }],
  });

  if (existedUser) {
    throw new ApiError(400, "User Already Exist");
  }

  const otp = generateOTP();
  const otpExpiry = Date.now() + 5 * 60 * 1000;

  await sendEmail({
  to: email,
  subject: "Your OTP Verification Code",
  text: `Your OTP is ${otp}`,
  html: `<h2>Your OTP is: <strong>${otp}</strong></h2>
         <p>This OTP will expire in 5 minutes.</p>`
  });


  // User creation - insert into database

  const user = await User.create({
    name,
    email,
    password,
    otp,
    otpExpiry,
    role: "user",
    isVerified: false,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -otp -otpExpiry"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while  registering a user");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        createdUser,
        "User Register Successfully, OTP Sent to Email!"
      )
    );
});

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  // 1. Validate input
  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  // 2. Find user
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // 3. Already verified?
  if (user.isVerified) {
    throw new ApiError(400, "User already verified");
  }

  // 4. Check OTP
  if (user.otp !== otp) {
    throw new ApiError(400, "Incorrect OTP");
  }

  // 5. Check OTP expiry
  if (user.otpExpiry < Date.now()) {
    throw new ApiError(400, "OTP expired. Please request a new one.");
  }

  // 6. OTP correct → verify user
  user.isVerified = true;
  user.otp = null;
  user.otpExpiry = null;

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Email verification successful"));
});

const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isVerified) {
    throw new ApiError(400, "User is already verified");
  }

  // Generate new OTP
  const newOTP = generateOTP();
  const otpExpiry = Date.now() + 5 * 60 * 1000;

  user.otp = newOTP;
  user.otpExpiry = otpExpiry;

  await user.save({ validateBeforeSave: false });

  // Send OTP Email
  await sendEmail({
    to: email,
    subject: "Your New OTP Code",
    text: `Your OTP is ${newOTP}`,
    html: `<h2>Your new OTP is <strong>${newOTP}</strong></h2>
           <p>It expires in 5 minutes.</p>`
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "New OTP sent to email"));
});


const loginUser = asyncHandler(async (req, res) => {
  // req body se data le aao
  // username or email
  // find the user
  // otp verification
  // password check
  // access and refresh token
  // send the cookie and response

  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({email});

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  if (!user.isVerified) {
    throw new ApiError(400, "Please verify your email before logging in");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -otp -otpExpiry"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User loggedIn Successfully"
      )
    );
});

const logoutUser = asyncHandler(async(req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: { refreshToken: 1 }
        },
        {
            new :true
        }
    )


    const options = {
     httpOnly : true,
     secure: false,  
     sameSite: "lax"
   }

   return res
   .status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(new ApiResponse(200 ,{},"user logged out"))
});


const refreshAccessToken = asyncHandler (async(req,res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken
    
    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized access")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"refresh token is expired or used")
        }
    
        const options = {
            httpOnly : true,
            secure :true
        }
        const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken , options)
        .cookie("refreshToken" ,refreshToken ,options)
        .json(
            new ApiResponse(
                200,
                {accessToken ,refreshToken},
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401 ,error?.message || "Invalid refresh token")
    }
});





export { registerUser, verifyOTP,resendOTP, loginUser, logoutUser ,refreshAccessToken };
