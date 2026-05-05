export const sendEmail = async (options) => {
  // Mock email sender that simply logs to the console for development
  // In a production environment, you would use Nodemailer, SendGrid, etc.
  
  console.log('\n========================================================');
  console.log('✉️  MOCK EMAIL SERVICE');
  console.log('========================================================');
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log('--------------------------------------------------------');
  console.log(options.text);
  console.log('========================================================\n');
};
