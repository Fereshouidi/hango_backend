require('dotenv').config();

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  MONGO_URI:
    process.env.MONGO_URI ||
    'mongodb+srv://feres997:feres997@cluster0.peiowiq.mongodb.net/hango',
  DB_NAME: process.env.DB_NAME || 'hango',
  JWT_SECRET: process.env.JWT_SECRET || 'hango-super-secret-jwt-key-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
  ADMIN_KEY: process.env.ADMIN_KEY || 'hango-admin-secret-key-2026',

  // Payment Recipient Details (can be customized via environment variables)
  PAYMENT_CONFIG: {
    d17: {
      id: 'd17',
      name: 'D17 (La Poste Tunisienne)',
      currency: 'DT',
      accountNumber: process.env.PAYMENT_D17_NUMBER || '29845347',
      instructions:
        '1. Open your D17 app.\n2. Choose "Transfert d\'argent" (Money Transfer).\n3. Send the exact amount to number: {accountNumber}.\n4. Enter your phone number/reference below and tap Continue.',
    },
    ooredoo: {
      id: 'ooredoo',
      name: 'Ooredoo (Recharge / Transfert)',
      currency: 'DT',
      accountNumber: process.env.PAYMENT_OOREDOO_NUMBER || '29845347',
      instructions:
        '1. Dial *120*{accountNumber}*{amount}# from your Ooredoo phone to transfer balance, OR send a recharge voucher.\n2. Once transferred, enter your phone number below and tap Continue.',
    },
    payeer: {
      id: 'payeer',
      name: 'Payeer (USD)',
      currency: '$',
      accountNumber: process.env.PAYMENT_PAYEER_ACCOUNT || 'P1084562143',
      instructions:
        '1. Open your Payeer wallet or app.\n2. Transfer exactly ${amount} USD to Payeer account: {accountNumber}.\n3. Copy the Batch / Transaction Operation ID.\n4. Enter your Payeer account and Transaction ID below and tap Continue.',
    },
  },

  // Subscription Plans
  SUBSCRIPTION_PLANS: [
    {
      id: '1_month',
      durationMonths: 1,
      title: '1 Month Access',
      tag: 'Basic',
      prices: {
        d17: 4.5,
        ooredoo: 4.5,
        payeer: 1.5,
      },
    },
    {
      id: '2_months',
      durationMonths: 2,
      title: '2 Months Access',
      tag: 'Save 11%',
      prices: {
        d17: 8.0,
        ooredoo: 8.0,
        payeer: 2.7,
      },
    },
    {
      id: '3_months',
      durationMonths: 3,
      title: '3 Months Access',
      tag: 'Best Value (Save 19%)',
      prices: {
        d17: 11.0,
        ooredoo: 11.0,
        payeer: 3.7,
      },
    },
  ],
};
