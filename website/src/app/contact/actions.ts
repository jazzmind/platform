"use server";

import { z } from "zod";
import { Resend } from "resend";

// Define form validation schema
const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  organization: z.string().optional(),
  event: z.string().min(1, "Event type is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export async function sendContactEmail(formData: FormData) {
  try {
    // Extract and validate form data
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      organization: formData.get("organization") as string,
      event: formData.get("event") as string,
      message: formData.get("message") as string,
    };

    // Validate the form data
    const validationResult = contactFormSchema.safeParse(data);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      return { success: false, errors };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.EMAIL_FROM || "website@sonnenreich.com";

    // Prepare email content
    const emailContent = `
      Name: ${data.name}
      Email: ${data.email}
      Organization: ${data.organization || "Not provided"}
      Event Type: ${data.event}

      Message:
      ${data.message}
    `;

    // Send email
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: "wes@sonnenreich.com",
      subject: "Contact from sonnenreich.com website",
      text: emailContent,
      replyTo: data.email,
    });

    if (error) {
      console.error("Error sending email:", error);
      return {
        success: false,
        errors: { _form: ["Failed to send email. Please try again later."] },
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      errors: { _form: ["Failed to send email. Please try again later."] },
    };
  }
}
