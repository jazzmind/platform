"use server";

import { z } from "zod";
import nodemailer from "nodemailer";
import fs from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';
import crypto from 'crypto';

// Define form validation schema
const eventRegistrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  organization: z.string().min(1, "Organization is required"),
  eventId: z.string().min(1, "Event ID is required"),
});

// Helper function to parse CSV rows for checking duplicate registrations
function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentValue = '';
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      if (i < row.length - 1 && row[i + 1] === '"') {
        // Handle escaped quote
        currentValue += '"';
        i++; // Skip the next quote
      } else {
        // Toggle in-quotes flag
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(currentValue);
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  // Add the last field
  result.push(currentValue);
  return result;
}

// Helper function to check if a registration already exists
async function checkExistingRegistration(eventId: string, datahash: string, email: string): Promise<boolean> {
  try {
    // Use exact filename pattern for prefix to prevent partial matches
    const csvFileName = `${eventId}-${datahash}-registration`;
    const existingBlobs = await list({ prefix: csvFileName });
    
    if (existingBlobs.blobs.length === 0) {
      return false; // No registrations yet
    }
    
    // Get the existing CSV content from the first blob that matches our prefix
    const existingBlobUrl = existingBlobs.blobs[0].url;
    console.log("Found existing registration CSV:", existingBlobs.blobs[0].pathname);
    
    const response = await fetch(existingBlobUrl, { cache: 'no-store' });
    if (!response.ok) {
      console.error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const csvContent = await response.text();
    
    if (csvContent.trim() === '') {
      return false; // Empty file
    }
    
    // Parse the CSV to check for existing registration
    const rows = csvContent.trim().split('\n');
    if (rows.length < 2) {
      return false; // Only header row, no registrations
    }
    
    const headerRow = rows[0];
    const emailColumnIndex = headerRow.split(',').findIndex(col => col.trim() === 'email');
    
    if (emailColumnIndex === -1) {
      throw new Error('Invalid CSV format: email column not found');
    }
    
    // Check if any row has the matching email
    for (let i = 1; i < rows.length; i++) {
      const columns = parseCSVRow(rows[i]);
      if (columns.length > emailColumnIndex && 
          columns[emailColumnIndex].toLowerCase().trim() === email.toLowerCase().trim()) {
        return true; // Found existing registration
      }
    }
    
    return false; // No existing registration found
  } catch (error) {
    console.error("Error checking existing registration:", error);
    // In case of error, return false to allow registration to proceed
    // This prevents blocking legitimate registrations due to temporary issues
    return false;
  }
}

// Helper function to send email with retry logic
async function sendEmailWithRetry(
  transporter: nodemailer.Transporter, 
  mailOptions: nodemailer.SendMailOptions,
  maxRetries = 3
): Promise<void> {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      console.log("Attempting to send email to:", mailOptions.to);
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.messageId);
      return; // Success
    } catch (error) {
      retries++;
      console.error(`Email send attempt ${retries} failed:`, error);
      
      if (retries >= maxRetries) {
        throw error; // Rethrow after max retries
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
    }
  }
}

export async function sendEventRegistration(formData: FormData) {
  try {
    // Extract and validate form data
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      organization: formData.get("organization") as string,
      eventId: formData.get("eventId") as string,
    };

    // Validate the form data
    const validationResult = eventRegistrationSchema.safeParse(data);
    
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      return { success: false, errors };
    }

    // Get event details and datahash
    let eventName = "Event";
    let datahash = "";
    try {
      // Try to get the event name from the eventId
      const eventPath = path.join(process.cwd(), `src/data/events/${data.eventId}.json`);
      
      if (fs.existsSync(eventPath)) {
        const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
        eventName = eventData.public.title;
        datahash = eventData.private.datahash || crypto.randomBytes(8).toString('hex');
      } else {
        // If event file doesn't exist, generate a random datahash
        datahash = crypto.randomBytes(8).toString('hex');
      }
    } catch (error) {
      console.error("Error reading event data:", error);
      datahash = crypto.randomBytes(8).toString('hex');
    }

    console.log("Processing registration for event:", eventName, "with hash:", datahash);

    // Check if registration already exists
    const existingRegistration = await checkExistingRegistration(data.eventId, datahash, data.email);
    if (existingRegistration) {
      return { 
        success: false, 
        errors: { 
          _form: ["You have already registered for this event. We will be in touch soon with more details."] 
        } 
      };
    }

    // First, try to store the registration data in Vercel Blob
    // This ensures we save the data even if email sending fails
    const csvFileName = `${data.eventId}-${datahash}-registration.csv`;
    const timestamp = new Date().toISOString();
    
    let csvContent = '';
    try {
      console.log("Storing registration data with filename:", csvFileName);
      
      // Get existing data or create a new CSV file
      const existingBlobs = await list({ prefix: `${data.eventId}-${datahash}-registration` });
      
      if (existingBlobs.blobs.length > 0) {
        // Use the first blob that matches our prefix pattern
        const existingBlobUrl = existingBlobs.blobs[0].url;
        console.log("Found existing CSV file:", existingBlobs.blobs[0].pathname);
        const response = await fetch(existingBlobUrl, { cache: 'no-store' });
        csvContent = await response.text();
      }
      
      if (csvContent === '') {
        // Create header row for a new CSV file
        const headerRow = ['name', 'email', 'organization', 'timestamp', 'approved'];
        csvContent = headerRow.join(',') + '\n';
      }
      
      // Create a new row with the registration data
      const registrationRow = [
        data.name,
        data.email,
        data.organization,
        timestamp,
        'pending'
      ].map(value => `"${value.toString().replace(/"/g, '""')}"`).join(',');
      
      // Append the new row to the CSV content
      csvContent += registrationRow + '\n';
      
      // Upload the updated CSV to the blob store with a fixed filename
      const blob = await put(csvFileName, csvContent, {
        contentType: 'text/csv',
        access: 'public',
        addRandomSuffix: false, // Important: prevent random suffix
      });
      
      console.log("Successfully stored registration data at:", blob.pathname);
    } catch (error) {
      console.error("Error storing registration data:", error);
      // If we failed to store data, still try to send emails but log the error
    }

    // Create email transport
    console.log("Setting up email transport with user:", process.env.EMAIL_USER);
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Add a longer timeout to prevent socket close errors
      connectionTimeout: 30000, // 30 seconds
      socketTimeout: 60000, // 60 seconds
      // Debug options
      logger: true,
      debug: true, // Include debug info in console
    });

    // Verify transport connection
    try {
      await transporter.verify();
      console.log("Email server connection verified");
    } catch (error) {
      console.error("Email server connection failed:", error);
    }

    // Prepare admin email content
    const adminEmailContent = `
      New Event Registration
      
      Event: ${eventName}
      Event ID: ${data.eventId}
      
      Attendee Information:
      Name: ${data.name}
      Email: ${data.email}
      Organization: ${data.organization}
      
      This registration was submitted from the website event page.
    `;

    // Prepare confirmation email to registrant
    const registrantEmailContent = `
      Thank you for registering for ${eventName}
      
      Your registration request has been received and is pending approval.
      You will receive another email within 24 hours if your registration is approved.
      
      Registration Details:
      Name: ${data.name}
      Email: ${data.email}
      Organization: ${data.organization}
      
      If you have any questions, please reply to this email.
    `;

    try {
      // Send admin notification email with retry
      await sendEmailWithRetry(
        transporter,
        {
          from: process.env.EMAIL_FROM || "wes@sonnenreich.com",
          to: "wes@sonnenreich.com",
          subject: `Event Registration: ${eventName}`,
          text: adminEmailContent,
          replyTo: data.email,
        }
      );

      // Send confirmation email to registrant with retry
      await sendEmailWithRetry(
        transporter,
        {
          from: process.env.EMAIL_FROM || "wes@sonnenreich.com",
          to: data.email,
          subject: `Registration Received: ${eventName}`,
          text: registrantEmailContent,
          replyTo: "wes@sonnenreich.com",
        }
      );
    } catch (error) {
      console.error("Error sending emails:", error);
      // If email fails but we stored the data, still consider it a success
      // since we can send emails manually later
    }

    return { success: true };
  } catch (error) {
    console.error("Error processing registration:", error);
    return { 
      success: false, 
      errors: { _form: ["Failed to process registration. Please try again later."] } 
    };
  }
} 