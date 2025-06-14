require('dotenv').config();
const nodemailer = require('nodemailer');

// Test email configuration
async function testEmailConfiguration() {
  console.log('🧪 Testing email configuration...');
  
  try {
    // Create transporter (same logic as in forms.js)
    let transporter;
    
    if (process.env.EMAIL_SERVICE) {
      transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      console.log(`📧 Using ${process.env.EMAIL_SERVICE} service`);
    } else {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      console.log(`📧 Using custom SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    }

    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');

    // Send test email
    const testEmail = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: 'Auto Universe - Email Configuration Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">🎉 Email Configuration Successful!</h2>
          <p>Your Auto Universe application email system is working correctly.</p>
          <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3>Configuration Details:</h3>
            <p><strong>Email Service:</strong> ${process.env.EMAIL_SERVICE || 'Custom SMTP'}</p>
            <p><strong>From Email:</strong> ${process.env.EMAIL_USER}</p>
            <p><strong>To Email:</strong> ${process.env.EMAIL_TO}</p>
            <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="color: #666;">
            This test email confirms that loan application notifications will be delivered successfully.
          </p>
        </div>
      `,
      text: `Email configuration test successful! 
             Service: ${process.env.EMAIL_SERVICE || 'Custom SMTP'}
             From: ${process.env.EMAIL_USER}
             To: ${process.env.EMAIL_TO}
             Time: ${new Date().toLocaleString()}`
    };

    const info = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    console.log('📨 Preview URL:', nodemailer.getTestMessageUrl(info));
    
    return true;
  } catch (error) {
    console.error('❌ Email configuration test failed:');
    console.error('Error:', error.message);
    
    // Provide specific error guidance
    if (error.code === 'EAUTH') {
      console.log('\n💡 Authentication failed. Please check:');
      console.log('   - Your email and password are correct');
      console.log('   - For Gmail: Enable 2FA and use App Password');
      console.log('   - For Outlook: Use your regular password');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 SMTP server not found. Please check:');
      console.log('   - Your EMAIL_SERVICE is correct');
      console.log('   - Your internet connection');
    } else {
      console.log('\n💡 Please check your .env configuration');
    }
    
    return false;
  }
}

// Run the test
testEmailConfiguration()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Email system is ready for loan applications!');
    } else {
      console.log('\n🔧 Please fix the configuration and try again.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
