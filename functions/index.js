/* eslint-disable space-before-function-paren */
/* eslint-disable prefer-arrow-callback */
/* eslint-disable object-curly-spacing */
/* eslint-disable comma-dangle */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Get Zoho config from Firebase Functions config
const zohoConfig = functions.config().zoho;

// Configure Zoho Mail transporter
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true,
  auth: {
    user: zohoConfig.email,
    pass: zohoConfig.password,
  },
});

// Test the transporter connection on function startup
transporter.verify(function (error, success) {
  if (error) {
    console.error("❌ Zoho SMTP connection failed:", error);
  } else {
    console.log("✅ Zoho SMTP server is ready to take our messages");
  }
});

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP Email
exports.sendVerificationOTP = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to send verification email"
      );
    }

    const { email, fullName } = data;

    // Validate input
    if (!email || !fullName) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email and full name are required"
      );
    }

    // Verify the requesting user owns the email
    if (context.auth.token.email !== email) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Can only send verification to your own email"
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Store OTP in Firestore
    await admin.firestore().collection("otpVerifications").add({
      email: email.toLowerCase(),
      otp: otp,
      expiresAt: expiresAt,
      verified: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: context.auth.uid, // Store user ID for reference
    });

    // Email content
    const mailOptions = {
      from: `"Union Management System" <${zohoConfig.email}>`,
      to: email,
      subject: "Verify Your Email - Union Management",
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #f9f9f9;
      border-radius: 10px;
      padding: 30px;
      border: 1px solid #e0e0e0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0;
    }
    .otp-box {
      background: white;
      border: 2px dashed #2563eb;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-code {
      font-size: 36px;
      font-weight: bold;
      color: #2563eb;
      letter-spacing: 8px;
      margin: 10px 0;
    }
    .info {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Email Verification</h1>
    </div>
    
    <p>Hi <strong>${fullName}</strong>,</p>
    
    <p>Welcome to the Union Management System! Please verify your email address to complete your registration.</p>
    
    <div class="otp-box">
      <p style="margin: 0; color: #666; font-size: 14px;">Your Verification Code</p>
      <div class="otp-code">${otp}</div>
      <p style="margin: 0; color: #666; font-size: 12px;">Valid for 10 minutes</p>
    </div>
    
    <p>Enter this code in the app to verify your email address.</p>
    
    <div class="info">
      <strong>⚠️ Security Notice:</strong>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>This code expires in 10 minutes</li>
        <li>Never share this code with anyone</li>
        <li>If you didn't request this, please ignore this email</li>
      </ul>
    </div>
    
    <p>If you have any questions, please contact our support team.</p>
    
    <div class="footer">
      <p>This is an automated message from Union Management System</p>
      <p>© ${new Date().getFullYear()} Union Management System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    console.log(`✅ OTP sent to ${email} for user ${context.auth.uid}`);

    return {
      success: true,
      message: "Verification code sent successfully",
    };
  } catch (error) {
    console.error("❌ Error sending OTP:", error);

    // Provide more specific error messages
    let errorMessage = "Failed to send verification email. Please try again.";

    if (error.code === "EAUTH") {
      errorMessage =
        "Email service configuration error. Please contact support.";
    } else if (error.code === "ECONNECTION") {
      errorMessage = "Cannot connect to email service. Please try again later.";
    }

    throw new functions.https.HttpsError("internal", errorMessage);
  }
});

// Verify OTP
exports.verifyOTP = functions.https.onCall(async (data, context) => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to verify OTP"
      );
    }

    const { email, otp } = data;

    // Validate input
    if (!email || !otp) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email and OTP are required"
      );
    }

    // Verify the requesting user owns the email
    if (context.auth.token.email !== email) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Can only verify your own email"
      );
    }

    // Find OTP in Firestore
    const otpSnapshot = await admin
      .firestore()
      .collection("otpVerifications")
      .where("email", "==", email.toLowerCase())
      .where("otp", "==", otp)
      .where("verified", "==", false)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (otpSnapshot.empty) {
      throw new functions.https.HttpsError(
        "not-found",
        "Invalid or expired verification code"
      );
    }

    const otpDoc = otpSnapshot.docs[0];
    const otpData = otpDoc.data();

    // Check expiry
    if (Date.now() > otpData.expiresAt) {
      throw new functions.https.HttpsError(
        "deadline-exceeded",
        "Verification code has expired"
      );
    }

    // Mark as verified
    await otpDoc.ref.update({
      verified: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedBy: context.auth.uid,
    });

    console.log(`✅ OTP verified for ${email} by user ${context.auth.uid}`);

    return {
      success: true,
      message: "Email verified successfully",
    };
  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// Resend OTP
exports.resendVerificationOTP = functions.https.onCall(
  async (data, context) => {
    try {
      // Check if user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated to resend verification email"
        );
      }

      const { email, fullName } = data;

      // Validate input
      if (!email || !fullName) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Email and full name are required"
        );
      }

      // Verify the requesting user owns the email
      if (context.auth.token.email !== email) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Can only resend verification to your own email"
        );
      }

      // Check rate limiting (max 3 requests per email per hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recentOtps = await admin
        .firestore()
        .collection("otpVerifications")
        .where("email", "==", email.toLowerCase())
        .where("createdAt", ">", new Date(oneHourAgo))
        .get();

      if (recentOtps.size >= 3) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          "Too many requests. Please try again later."
        );
      }

      // Generate new OTP
      const otp = generateOTP();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      // Store OTP
      await admin.firestore().collection("otpVerifications").add({
        email: email.toLowerCase(),
        otp: otp,
        expiresAt: expiresAt,
        verified: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        userId: context.auth.uid,
      });

      // Send email
      const mailOptions = {
        from: `"Union Management System" <${zohoConfig.email}>`,
        to: email,
        subject: "New Verification Code - Union Management",
        html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #f9f9f9;
      border-radius: 10px;
      padding: 30px;
      border: 1px solid #e0e0e0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0;
    }
    .otp-box {
      background: white;
      border: 2px dashed #2563eb;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-code {
      font-size: 36px;
      font-weight: bold;
      color: #2563eb;
      letter-spacing: 8px;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 New Verification Code</h1>
    </div>
    
    <p>Hi <strong>${fullName}</strong>,</p>
    
    <p>Here is your new verification code as requested:</p>
    
    <div class="otp-box">
      <p style="margin: 0; color: #666; font-size: 14px;">Your New Verification Code</p>
      <div class="otp-code">${otp}</div>
      <p style="margin: 0; color: #666; font-size: 12px;">Valid for 10 minutes</p>
    </div>
    
    <p>Enter this code in the app to verify your email address.</p>
  </div>
</body>
</html>
      `,
      };

      await transporter.sendMail(mailOptions);

      console.log(`✅ OTP resent to ${email} for user ${context.auth.uid}`);

      return {
        success: true,
        message: "New verification code sent successfully",
      };
    } catch (error) {
      console.error("❌ Error resending OTP:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  }
);

// Clean up expired OTPs (run daily)
exports.cleanupExpiredOTPs = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    const now = Date.now();
    const expiredOtps = await admin
      .firestore()
      .collection("otpVerifications")
      .where("expiresAt", "<", now)
      .get();

    const batch = admin.firestore().batch();
    expiredOtps.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ Cleaned up ${expiredOtps.size} expired OTPs`);
  });
