import bcrypt from "bcryptjs";
import connectDB from "@/lib/db/mongodb";
import User, { IUser } from "@/lib/db/models/User";
import OTP from "@/lib/db/models/OTP";
import { sendOTPLoginEmail } from "@/lib/email/otp-login";

export type OTPType = "login" | "password_reset";

class OTPService {
  /**
   * Generate a random 6-digit code (100000-999999)
   */
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash a code using bcrypt
   */
  async hashCode(code: string): Promise<string> {
    return bcrypt.hash(code, 10);
  }

  /**
   * Verify a plain code against a hashed code
   */
  async verifyCode(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  /**
   * Check rate limit: max 3 OTP requests per hour per email
   */
  async checkRateLimit(email: string): Promise<{
    allowed: boolean;
    remainingRequests: number;
  }> {
    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // If user doesn't exist, still check rate limit by email
      // We'll track by a temporary identifier
      return { allowed: true, remainingRequests: 3 };
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOTPs = await OTP.countDocuments({
      userId: user._id,
      type: "login",
      createdAt: { $gte: oneHourAgo },
    });

    const remainingRequests = Math.max(0, 3 - recentOTPs);
    return {
      allowed: remainingRequests > 0,
      remainingRequests,
    };
  }

  /**
   * Create and send OTP code
   */
  async createAndSend(
    email: string,
    type: OTPType = "login"
  ): Promise<{ success: boolean; message: string }> {
    await connectDB();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // For login type, user must exist
    if (type === "login" && !user) {
      // Don't reveal if user exists - return generic success
      return {
        success: true,
        message: "If an account exists with this email, a code has been sent.",
      };
    }

    // For password reset, we can allow non-existent emails (same security behavior)
    if (!user) {
      return {
        success: true,
        message: "If an account exists with this email, a code has been sent.",
      };
    }

    // Check rate limit
    console.log("[OTPService.createAndSend] Checking rate limit");
    const rateLimit = await this.checkRateLimit(email);
    console.log("[OTPService.createAndSend] Rate limit result:", rateLimit);
    if (!rateLimit.allowed) {
      console.log("[OTPService.createAndSend] Rate limit exceeded");
      return {
        success: false,
        message: `Too many requests. Please try again in ${Math.ceil(
          (60 - (Date.now() - (Date.now() - 60 * 60 * 1000)) / 1000 / 60)
        )} minutes.`,
      };
    }

    // Generate 6-digit code
    const plainCode = this.generateCode();
    const hashedCode = await this.hashCode(plainCode);
    console.log("[OTPService.createAndSend] Generated OTP code", { codeLength: plainCode.length });

    // Delete any existing unused OTPs for this user and type
    console.log("[OTPService.createAndSend] Deleting existing unused OTPs", { userId: user._id, type });
    const deleteResult = await OTP.deleteMany({
      userId: user._id,
      type,
      used: false,
    });
    console.log("[OTPService.createAndSend] Deleted OTPs:", { deletedCount: deleteResult.deletedCount });

    // Create new OTP
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    const otp = new OTP({
      userId: user._id,
      code: hashedCode,
      expiresAt,
      attempts: 0,
      used: false,
      type,
    });

    await otp.save();
    console.log("[OTPService.createAndSend] OTP saved", { otpId: otp._id ? otp._id.toString() : "unknown", expiresAt: expiresAt.toISOString() });

    // Send email with plain code
    console.log("[OTPService.createAndSend] Attempting to send email", { to: user.email, type });
    try {
      if (type === "login") {
        await sendOTPLoginEmail({
          to: user.email,
          code: plainCode,
          username: user.username,
        });
        console.log("[OTPService.createAndSend] Email sent successfully", { to: user.email });
      }
      // For password_reset, we'd use a different email template if needed
    } catch (error) {
      console.error("[OTPService.createAndSend] Failed to send OTP email:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        to: user.email,
        timestamp: new Date().toISOString(),
      });
      // Delete the OTP if email fails
      if (otp._id) {
        await OTP.findByIdAndDelete(otp._id);
        console.log("[OTPService.createAndSend] Deleted OTP due to email failure");
      }
      
      // Check if it's a Resend API key error
      if (error instanceof Error && error.message.includes("RESEND_API_KEY")) {
        throw new Error("Email service is not configured. Please contact support.");
      }
      
      throw new Error("Failed to send verification code. Please try again.");
    }

    return {
      success: true,
      message: "If an account exists with this email, a code has been sent.",
    };
  }

  /**
   * Verify OTP code
   */
  async verify(
    email: string,
    code: string,
    type: OTPType = "login"
  ): Promise<{
    valid: boolean;
    userId?: string;
    attemptsRemaining?: number;
    message?: string;
  }> {
    await connectDB();

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return {
        valid: false,
        message: "Code must be 6 digits",
      };
    }

    // Find user
    const normalizedEmail = email.toLowerCase();
    console.log("[OTPService.verify] Starting verification", { email, normalizedEmail, type, timestamp: new Date().toISOString() });
    
    const user: IUser | null = await User.findOne({ email: normalizedEmail });
    console.log("[OTPService.verify] User lookup:", { 
      found: !!user, 
      userId: user?._id?.toString(),
      email: user?.email 
    });
    
    if (!user || !user._id) {
      console.log("[OTPService.verify] User not found or missing _id");
      return {
        valid: false,
        message: "Invalid code",
      };
    }

    // Find active OTP
    console.log("[OTPService.verify] Looking for active OTP", { userId: user._id, type });
    const otp = await OTP.findOne({
      userId: user._id,
      type,
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 }); // Get most recent
    console.log("[OTPService.verify] OTP lookup result:", { 
      found: !!otp, 
      otpId: otp?._id?.toString(),
      attempts: otp?.attempts,
      expiresAt: otp?.expiresAt?.toISOString() 
    });

    if (!otp) {
      console.log("[OTPService.verify] No active OTP found");
      return {
        valid: false,
        message: "Code expired or invalid. Request a new code.",
      };
    }

    // Check attempts
    if (otp.attempts >= 5) {
      console.log("[OTPService.verify] Too many attempts", { attempts: otp.attempts });
      // Mark as used to prevent further attempts
      otp.used = true;
      await otp.save();
      return {
        valid: false,
        message: "Too many failed attempts. Request a new code.",
      };
    }

    // Verify code
    console.log("[OTPService.verify] Verifying code", { attempts: otp.attempts });
    const isValid = await this.verifyCode(code, otp.code);
    console.log("[OTPService.verify] Code verification result:", { isValid });

    if (!isValid) {
      // Increment attempts
      otp.attempts += 1;
      await otp.save();
      console.log("[OTPService.verify] Invalid code, attempts incremented", { attempts: otp.attempts });

      const attemptsRemaining = 5 - otp.attempts;
      return {
        valid: false,
        attemptsRemaining,
        message: `Invalid code. ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? "s" : ""} remaining.`,
      };
    }

    // Code is valid - mark as used
    console.log("[OTPService.verify] Code is valid, marking as used");
    otp.used = true;
    await otp.save();
    console.log("[OTPService.verify] OTP marked as used successfully", { userId: user._id.toString() });

    return {
      valid: true,
      userId: user._id.toString(),
    };
  }
}

const otpService = new OTPService();
export default otpService;

