const nodemailer = require('nodemailer');

// Configure transporter
// For local development, if SMTP is not provided, we could use ethereal email or just log it
const getTransporter = () => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Mock transporter for development if no SMTP is configured
    console.warn("WARNING: No SMTP configuration found. Emails will only be logged to console.");
    return {
      sendMail: async (options) => {
        console.log('\n================== MOCK EMAIL ==================');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Text: ${options.text}`);
        console.log('================================================\n');
        return { messageId: 'mock-id' };
      }
    };
  }
};

const sendVerificationCode = async (email, code) => {
  const transporter = getTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Convex Manager" <noreply@convex-manager.local>',
    to: email,
    subject: 'Your Registration Code',
    text: `Welcome to Convex Manager!\n\nYour registration code is: ${code}\n\nThis code will expire in 15 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #F06C00;">Convex Manager</h2>
        <p>Welcome!</p>
        <p>Your registration code is:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p>This code will expire in 15 minutes.</p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

const sendPasswordResetCode = async (email, code) => {
  const transporter = getTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Convex Manager" <noreply@convex-manager.local>',
    to: email,
    subject: 'Password Reset Code',
    text: `You requested a password reset.\n\nYour reset code is: ${code}\n\nThis code will expire in 15 minutes. If you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #F06C00;">Convex Manager</h2>
        <p>You requested a password reset.</p>
        <p>Your reset code is:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p>This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

const sendInvitationLink = async (email, role, token) => {
  const transporter = getTransporter();
  const appUrl = process.env.APP_URL || 'http://localhost:5173'; // Fallback for local dev
  const inviteUrl = `${appUrl}/invite?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Convex Manager" <noreply@convex-manager.local>',
    to: email,
    subject: 'You have been invited to Convex Manager',
    text: `You have been invited to join Convex Manager as a ${role}.\n\nPlease click the link below to set up your account:\n${inviteUrl}\n\nThis link will expire in 24 hours.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #F06C00;">Convex Manager</h2>
        <p>You have been invited to join Convex Manager as a <strong>${role}</strong>.</p>
        <p>Please click the button below to set up your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #F06C00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Accept Invitation</a>
        </div>
        <p style="font-size: 12px; color: #666;">Or copy and paste this link into your browser:<br>${inviteUrl}</p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = {
  sendVerificationCode,
  sendPasswordResetCode,
  sendInvitationLink
};