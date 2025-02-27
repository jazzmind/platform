"use server";

import { z } from "zod";
import nodemailer from "nodemailer";

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

    // Create email transport
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

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
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "website@sonnenreich.com",
      to: "wes@sonnenreich.com",
      subject: "Contact from sonnenreich.com website",
      text: emailContent,
      replyTo: data.email,
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { 
      success: false, 
      errors: { _form: ["Failed to send email. Please try again later."] } 
    };
  }
} 