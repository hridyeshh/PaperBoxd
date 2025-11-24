
import {NextRequest, NextResponse} from "next/server";
import User from "@/lib/db/models/User";
import {createTransport} from "nodemailer";
import crypto from "crypto";
import dbConnect from "@/lib/db/mongodb";

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const {email} = await req.json();

        if (!email) {
            return NextResponse.json({message: "Email is required"}, {status: 400});
        }

        const user = await User.findOne({email});

        if (!user) {
            // Don't reveal if user exists for security
            return NextResponse.json({message: "If an account exists with this email, a password reset link has been sent."}, {status: 200});
        }

        const token = crypto.randomBytes(20).toString('hex');
        const expires = new Date();
        expires.setHours(expires.getHours() + 1);

        user.resetPasswordToken = token;
        user.resetPasswordExpires = expires;
        await user.save();

        const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

        // Check if email configuration is available
        const emailHost = process.env.EMAIL_SERVER_HOST;
        const emailPort = process.env.EMAIL_SERVER_PORT;
        const emailUser = process.env.EMAIL_SERVER_USER;
        const emailPassword = process.env.EMAIL_SERVER_PASSWORD;
        const emailFrom = process.env.EMAIL_FROM;

        if (!emailHost || !emailPort || !emailUser || !emailPassword || !emailFrom) {
            // In development, log the reset link to console
            if (process.env.NODE_ENV === 'development') {
                console.log('\n=== PASSWORD RESET LINK (Development Mode) ===');
                console.log(`Reset link for ${email}: ${resetLink}`);
                console.log('===============================================\n');
                return NextResponse.json({
                    message: "Password reset link generated. Check console for the link (development mode)."
                }, {status: 200});
            }
            
            return NextResponse.json({
                message: "Email service is not configured. Please contact support."
            }, {status: 500});
        }

        const transporter = createTransport({
            host: emailHost,
            port: parseInt(emailPort, 10),
            secure: parseInt(emailPort, 10) === 465, // Use secure for port 465, otherwise false
            auth: {
                user: emailUser,
                pass: emailPassword,
            },
        });

        const mailOptions = {
            from: emailFrom,
            to: email,
            subject: 'Password Reset - PaperBoxd',
            text: `Click the link to reset your password: ${resetLink}\n\nThis link will expire in 1 hour.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset Request</h2>
                    <p>You requested to reset your password for your PaperBoxd account.</p>
                    <p>Click the link below to reset your password:</p>
                    <p><a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #666;">${resetLink}</p>
                    <p style="color: #999; font-size: 12px;">This link will expire in 1 hour.</p>
                    <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        return NextResponse.json({
            message: "If an account exists with this email, a password reset link has been sent."
        }, {status: 200});
    } catch (error: unknown) {
        console.error('Password reset error:', error);
        
        // Provide more specific error messages
        if (error && typeof error === 'object' && 'code' in error) {
            const errorCode = (error as { code?: string }).code;
            if (errorCode === 'ECONNREFUSED') {
                return NextResponse.json({
                    message: "Unable to connect to email server. Please try again later or contact support."
                }, {status: 500});
            }
            
            if (errorCode === 'EAUTH') {
                return NextResponse.json({
                    message: "Email authentication failed. Please contact support."
                }, {status: 500});
            }
        }

        return NextResponse.json({
            message: "An error occurred while sending the reset email. Please try again later."
        }, {status: 500});
    }
}
