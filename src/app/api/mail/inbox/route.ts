import { getMails } from "@/features/mail/mail.service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const mails = await getMails();
    return NextResponse.json(mails);
  } catch (error) {
    return NextResponse.json(
      { message: "Mailler alınamadı.", error: error },
      { status: 500 }
    );
  }
}
