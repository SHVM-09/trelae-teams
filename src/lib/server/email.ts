import { Resend } from "resend";
import { env } from "$env/dynamic/private";

const resend = new Resend(env.RESEND_API_KEY);

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