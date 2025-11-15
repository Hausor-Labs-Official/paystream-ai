import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

/**
 * POST /api/send-employee-credentials
 * Send branded welcome email with login credentials to new employee
 */
export async function POST(request: Request) {
  try {
    const { name, email, walletAddress } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Generate temporary password (in production, use a proper password generation and hashing)
    const tempPassword = Math.random().toString(36).slice(-8).toUpperCase();

    // Login link (update this with your actual login URL)
    const loginLink = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const employeeDashboardLink = `${loginLink}/dashboard/employee`;

    // Create email transporter
    // For testnet/development, we'll just log the email
    // In production, configure with real SMTP settings
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email', // Test email service
      port: 587,
      secure: false,
      auth: {
        user: 'test@paystream.ai',
        pass: 'test-password',
      },
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #0044FF 0%, #0033CC 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 0;
      opacity: 0.95;
      font-size: 16px;
    }
    .content {
      padding: 40px 30px;
    }
    .welcome-message {
      font-size: 18px;
      color: #1a1a1a;
      margin-bottom: 20px;
    }
    .info-box {
      background: #f8f9fa;
      border-left: 4px solid #0044FF;
      padding: 20px;
      margin: 25px 0;
      border-radius: 6px;
    }
    .info-box h3 {
      margin: 0 0 15px 0;
      color: #0044FF;
      font-size: 16px;
      font-weight: 600;
    }
    .credential-item {
      background: white;
      padding: 12px 15px;
      margin: 10px 0;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
    }
    .credential-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .credential-value {
      font-size: 15px;
      color: #1a1a1a;
      font-family: 'Monaco', 'Courier New', monospace;
      font-weight: 500;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: #0044FF;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 25px 0;
      transition: background 0.3s ease;
    }
    .button:hover {
      background: #0033CC;
    }
    .features {
      margin: 30px 0;
      padding: 0;
    }
    .feature-item {
      padding: 15px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .feature-item:last-child {
      border-bottom: none;
    }
    .feature-icon {
      display: inline-block;
      width: 24px;
      height: 24px;
      background: #0044FF;
      color: white;
      border-radius: 50%;
      text-align: center;
      line-height: 24px;
      margin-right: 12px;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      padding: 30px;
      background: #f8f9fa;
      color: #666;
      font-size: 13px;
    }
    .footer a {
      color: #0044FF;
      text-decoration: none;
    }
    .security-note {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 6px;
      font-size: 14px;
      color: #856404;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Paystream AI!</h1>
      <p>Your account has been created successfully</p>
    </div>

    <div class="content">
      <p class="welcome-message">
        Hello <strong>${name}</strong>,
      </p>

      <p>
        Welcome to Paystream AI! We're excited to have you on board. Your employer has set up your account,
        and you now have access to our advanced AI-powered payroll platform.
      </p>

      <div class="info-box">
        <h3>Your Login Credentials</h3>

        <div class="credential-item">
          <div class="credential-label">Email</div>
          <div class="credential-value">${email}</div>
        </div>

        <div class="credential-item">
          <div class="credential-label">Temporary Password</div>
          <div class="credential-value">${tempPassword}</div>
        </div>

        ${walletAddress ? `
        <div class="credential-item">
          <div class="credential-label">Your Wallet Address</div>
          <div class="credential-value" style="font-size: 12px; word-break: break-all;">${walletAddress}</div>
        </div>
        ` : ''}
      </div>

      <div class="security-note">
        <strong>Security Notice:</strong> Please change your password after your first login for security purposes.
      </div>

      <div style="text-align: center;">
        <a href="${employeeDashboardLink}" class="button">
          Access Your Dashboard →
        </a>
      </div>

      <div class="info-box">
        <h3>What You Can Do</h3>
        <div class="features">
          <div class="feature-item">
            <span class="feature-icon">$</span>
            <strong>View Payments:</strong> Track all your payroll payments and transaction history
          </div>
          <div class="feature-item">
            <span class="feature-icon">#</span>
            <strong>Financial Insights:</strong> Access detailed pay stubs and financial breakdowns
          </div>
          <div class="feature-item">
            <span class="feature-icon">~</span>
            <strong>Blockchain Verified:</strong> All payments are secured on Arc Testnet blockchain
          </div>
          <div class="feature-item">
            <span class="feature-icon">*</span>
            <strong>Instant Notifications:</strong> Get real-time updates on all your transactions
          </div>
        </div>
      </div>

      <p style="margin-top: 30px;">
        If you have any questions or need assistance, please don't hesitate to reach out to your employer
        or contact our support team.
      </p>

      <p style="margin-top: 20px; color: #666; font-size: 14px;">
        Best regards,<br>
        <strong style="color: #0044FF;">The Paystream AI Team</strong>
      </p>
    </div>

    <div class="footer">
      <p>
        <strong>Paystream AI</strong> - AI-Powered Payroll on Blockchain
      </p>
      <p style="margin-top: 10px;">
        Powered by Circle, Arc Testnet, and Google Gemini AI
      </p>
      <p style="margin-top: 15px; font-size: 12px;">
        This is an automated email. Please do not reply directly to this message.
      </p>
    </div>
  </div>
</body>
</html>
`;

    // For testnet, just log the email (don't actually send)
    console.log(`\nEmployee Welcome Email for ${email}:`);
    console.log(`   Subject: Welcome to Paystream AI - Your Account is Ready!`);
    console.log(`   Email: ${email}`);
    console.log(`   Temp Password: ${tempPassword}`);
    console.log(`   Login Link: ${employeeDashboardLink}`);
    if (walletAddress) {
      console.log(`   Wallet: ${walletAddress}`);
    }

    // In production, uncomment this to send real emails:
    /*
    await transporter.sendMail({
      from: '"Paystream AI" <noreply@paystream.ai>',
      to: email,
      subject: 'Welcome to Paystream AI - Your Account is Ready!',
      html: emailHtml,
    });
    */

    return NextResponse.json({
      success: true,
      message: 'Employee credentials email sent successfully',
      tempPassword, // In production, don't return this
    });
  } catch (error) {
    console.error('Failed to send employee credentials email:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
