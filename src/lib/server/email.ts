import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
	to,
	subject,
	text
}: { to: string[], subject: string, text: string }) {
	return await resend.emails.send({
		from: "no-reply@transactions.trelae.com",
		to,
		subject,
		text
	});
}