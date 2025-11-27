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

interface SendPasswordResetEmailParams {
  to: string;
  resetUrl: string;
  username?: string;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  username,
}: SendPasswordResetEmailParams): Promise<void> {
  const displayName = username || to.split("@")[0];

  // In development, log to console instead of sending email
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    console.log("\n=== PASSWORD RESET LINK (Development Mode) ===");
    console.log(`Email: ${to}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log("===============================================\n");
    return;
  }

  try {
    console.log("[sendPasswordResetEmail] Starting email send", { 
      to, 
      username, 
      fromEmail: process.env.RESEND_FROM_EMAIL || "PaperBoxd <onboarding@resend.dev>",
      hasApiKey: !!process.env.RESEND_API_KEY,
      timestamp: new Date().toISOString() 
    });
    
    const resend = getResend();
    // Use Resend's default sending domain or configured domain
    // Format: "Name <email@domain.com>" or just "email@domain.com"
    // For Resend, you can use: "onboarding@resend.dev" (default) or your verified domain
    const fromEmail = process.env.RESEND_FROM_EMAIL || "PaperBoxd <onboarding@resend.dev>";
    
    console.log("[sendPasswordResetEmail] Calling Resend API", { from: fromEmail, to });
    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject: "Reset Your Password - PaperBoxd",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
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
                          You requested to reset your password for your PaperBoxd account.
                        </p>
                        
                        <!-- Reset Button -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 40px 0;">
                          <tr>
                            <td align="center">
                              <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background-color: #252525; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 500; text-align: center; border: 1px solid #252525;">
                                Reset Password
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 32px 0 16px; font-size: 14px; line-height: 1.6; color: #8a8a8a; text-align: center;">
                          Or copy and paste this link into your browser:
                        </p>
                        <p style="margin: 0 0 32px; font-size: 12px; line-height: 1.6; color: #8a8a8a; word-break: break-all; text-align: center; font-family: 'Courier New', monospace;">
                          ${resetUrl}
                        </p>
                        
                        <!-- Expiry Warning -->
                        <div style="padding: 16px 20px; background-color: #f7f7f7; border: 1px solid #ebebeb; border-radius: 10px; margin: 32px 0;">
                          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #5a5a5a;">
                            <strong style="color: #252525;">This link expires in 1 hour.</strong> If you don't reset your password within this time, you'll need to request a new link.
                          </p>
                        </div>
                        
                        <!-- Security Notice -->
                        <div style="padding: 16px 20px; background-color: #f7f7f7; border: 1px solid #ebebeb; border-radius: 10px; margin: 24px 0;">
                          <p style="margin: 0 0 8px; font-size: 14px; line-height: 1.6; color: #252525; font-weight: 500;">
                            Security Notice
                          </p>
                          <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #5a5a5a;">
                            Never share this link with anyone. PaperBoxd staff will never ask for your password reset link.
                          </p>
                        </div>
                        
                        <p style="margin: 32px 0 0; font-size: 14px; line-height: 1.6; color: #8a8a8a;">
                          If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
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
    console.log("[sendPasswordResetEmail] Resend API response:", { 
      hasError: !!result.error, 
      hasData: !!result.data,
      error: result.error,
      dataId: result.data?.id 
    });
    
    if (result.error) {
      console.error("[sendPasswordResetEmail] Resend API error details:", {
        error: result.error,
        errorType: typeof result.error,
        errorString: JSON.stringify(result.error, null, 2),
        to,
        from: fromEmail,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Failed to send email: ${JSON.stringify(result.error)}`);
    }

    console.log("[sendPasswordResetEmail] ✅ Password reset email sent successfully:", {
      to,
      id: result.data?.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[sendPasswordResetEmail] Error caught:", {
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      to,
      username,
      timestamp: new Date().toISOString(),
    });
    
    // In development, still log the link even if email fails
    if (process.env.NODE_ENV === "development") {
      console.log("\n=== PASSWORD RESET LINK (Email Failed, Development Fallback) ===");
      console.log(`Email: ${to}`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log("==================================================================\n");
    }
    
    throw new Error("Failed to send password reset email");
  }
}

