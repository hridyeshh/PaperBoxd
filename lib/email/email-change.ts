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

interface SendEmailChangeOTPParams {
  to: string;
  code: string;
  username?: string;
}

export async function sendEmailChangeOTP({
  to,
  code,
  username,
}: SendEmailChangeOTPParams): Promise<void> {
  const displayName = username || to.split("@")[0];

  // In development, log to console instead of sending email
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    console.log("\n=== EMAIL CHANGE OTP CODE (Development Mode) ===");
    console.log(`New Email: ${to}`);
    console.log(`Code: ${code}`);
    console.log("==================================================\n");
    return;
  }

  try {
    console.log("[sendEmailChangeOTP] Starting email send", { 
      to, 
      username, 
      codeLength: code.length,
      fromEmail: process.env.RESEND_FROM_EMAIL || "PaperBoxd <onboarding@resend.dev>",
      hasApiKey: !!process.env.RESEND_API_KEY,
      timestamp: new Date().toISOString() 
    });
    
    const resend = getResend();
    const fromEmail = process.env.RESEND_FROM_EMAIL || "PaperBoxd <onboarding@resend.dev>";
    
    console.log("[sendEmailChangeOTP] Calling Resend API", { from: fromEmail, to });
    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject: "Verify Your New Email - PaperBoxd",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your New Email</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ffffff;">
              <tr>
                <td style="padding: 40px 20px; text-align: center;">
                  <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                    <tr>
                      <td style="padding: 40px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Verify Your New Email</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                          Hi ${displayName},
                        </p>
                        <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                          You requested to change your email address on PaperBoxd. Use the verification code below to confirm your new email:
                        </p>
                        <div style="background-color: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
                          <p style="margin: 0; color: #111827; font-size: 32px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</p>
                        </div>
                        <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                          This code will expire in 10 minutes. If you didn't request this change, please ignore this email.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
                        <p style="margin: 0; color: #6b7280; font-size: 12px;">
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

    if (result.error) {
      console.error("[sendEmailChangeOTP] Resend API error:", result.error);
      throw new Error(`Failed to send email: ${result.error.message || "Unknown error"}`);
    }

    console.log("[sendEmailChangeOTP] Email sent successfully", { 
      to, 
      emailId: result.data?.id,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error("[sendEmailChangeOTP] Failed to send email:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      to,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

