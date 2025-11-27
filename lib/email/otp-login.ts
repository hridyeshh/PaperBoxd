import { Resend } from "resend";

// Lazy initialization to avoid Edge Runtime issues
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured. Please set it in your environment variables.");
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

interface SendOTPLoginEmailParams {
  to: string;
  code: string;
  username?: string;
}

export async function sendOTPLoginEmail({
  to,
  code,
  username,
}: SendOTPLoginEmailParams): Promise<void> {
  const displayName = username || to.split("@")[0];

  // In development, log to console instead of sending email
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    console.log("\n=== OTP LOGIN CODE (Development Mode) ===");
    console.log(`Email: ${to}`);
    console.log(`Code: ${code}`);
    console.log("==========================================\n");
    return;
  }

  try {
    console.log("[sendOTPLoginEmail] Starting email send", { 
      to, 
      username, 
      codeLength: code.length,
      fromEmail: process.env.RESEND_FROM_EMAIL || "PaperBoxd <onboarding@resend.dev>",
      hasApiKey: !!process.env.RESEND_API_KEY,
      timestamp: new Date().toISOString() 
    });
    
    const resend = getResend();
    // Use Resend's default sending domain or configured domain
    // Format: "Name <email@domain.com>" or just "email@domain.com"
    // For Resend, you can use: "onboarding@resend.dev" (default) or your verified domain
    const fromEmail = process.env.RESEND_FROM_EMAIL || "PaperBoxd <onboarding@resend.dev>";
    
    console.log("[sendOTPLoginEmail] Calling Resend API", { from: fromEmail, to });
    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject: "Your Login Code - PaperBoxd",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Login Code</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ffffff;">
              <tr>
                <td align="center" style="padding: 48px 20px;">
                  <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #ebebeb; border-radius: 10px;">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 48px 48px 32px; text-align: center; border-bottom: 1px solid #ebebeb;">
                        <h1 style="margin: 0; font-size: 32px; font-weight: 600; color: #252525; font-family: 'el-paso', serif; letter-spacing: -0.02em;">PaperBoxd</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 48px;">
                        <p style="margin: 0 0 8px; font-size: 16px; line-height: 1.6; color: #252525; font-weight: 500;">
                          Hi ${displayName},
                        </p>
                        <p style="margin: 0 0 40px; font-size: 15px; line-height: 1.6; color: #5a5a5a;">
                          Your verification code to sign in to PaperBoxd:
                        </p>
                        
                        <!-- Code Display -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 40px 0;">
                          <tr>
                            <td align="center">
                              <div style="display: inline-block; padding: 32px 48px; background-color: #f7f7f7; border: 1px solid #ebebeb; border-radius: 10px;">
                                <p style="margin: 0; font-size: 40px; font-weight: 700; letter-spacing: 12px; font-family: 'Courier New', monospace; color: #252525;">
                                  ${code}
                                </p>
                              </div>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Expiry Warning -->
                        <div style="padding: 16px 20px; background-color: #f7f7f7; border: 1px solid #ebebeb; border-radius: 10px; margin: 32px 0;">
                          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #5a5a5a;">
                            <strong style="color: #252525;">This code expires in 10 minutes.</strong> Enter it on the sign-in page to complete your login.
                          </p>
                        </div>
                        
                        <!-- Security Notice -->
                        <div style="padding: 16px 20px; background-color: #f7f7f7; border: 1px solid #ebebeb; border-radius: 10px; margin: 24px 0;">
                          <p style="margin: 0 0 8px; font-size: 14px; line-height: 1.6; color: #252525; font-weight: 500;">
                            Security Notice
                          </p>
                          <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #5a5a5a;">
                            Never share this code with anyone. PaperBoxd staff will never ask for your verification code. You have 5 attempts to enter the correct code.
                          </p>
                        </div>
                        
                        <p style="margin: 32px 0 0; font-size: 14px; line-height: 1.6; color: #8a8a8a;">
                          If you didn't request this code, please ignore this email. Your account remains secure.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 32px 48px; background-color: #f7f7f7; border-top: 1px solid #ebebeb; text-align: center; border-radius: 0 0 10px 10px;">
                        <p style="margin: 0 0 8px; font-size: 12px; line-height: 1.6; color: #8a8a8a;">
                          Need help? Contact us at <a href="mailto:paperboxd@gmail.com" style="color: #252525; text-decoration: underline; text-underline-offset: 2px;">paperboxd@gmail.com</a>
                        </p>
                        <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #8a8a8a;">
                          © ${new Date().getFullYear()} PaperBoxd. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    // Log the result for debugging
    console.log("[sendOTPLoginEmail] Resend API response:", { 
      hasError: !!result.error, 
      hasData: !!result.data,
      error: result.error,
      dataId: result.data?.id 
    });
    
    if (result.error) {
      console.error("[sendOTPLoginEmail] Resend API error details:", {
        error: result.error,
        errorType: typeof result.error,
        errorString: JSON.stringify(result.error, null, 2),
        to,
        from: fromEmail,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Failed to send email: ${JSON.stringify(result.error)}`);
    }

    console.log("[sendOTPLoginEmail] ✅ OTP email sent successfully:", {
      to,
      id: result.data?.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[sendOTPLoginEmail] Error caught:", {
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      to,
      username,
      timestamp: new Date().toISOString(),
    });
    
    // In development, still log the code even if email fails
    if (process.env.NODE_ENV === "development") {
      console.log("\n=== OTP LOGIN CODE (Email Failed, Development Fallback) ===");
      console.log(`Email: ${to}`);
      console.log(`Code: ${code}`);
      console.log("============================================================\n");
    }
    
    throw new Error("Failed to send OTP login email");
  }
}

