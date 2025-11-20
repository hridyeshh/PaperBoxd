
import {NextRequest, NextResponse} from "next/server";
import User from "@/lib/db/models/User";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db/mongodb";

export async function POST(req: NextRequest) {
    await dbConnect();

    const {token, password} = await req.json();

    const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: {$gt: new Date()},
    });

    if (!user) {
        return NextResponse.json({message: "Invalid or expired token"}, {status: 400});
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return NextResponse.json({message: "Password reset successful"}, {status: 200});
}
