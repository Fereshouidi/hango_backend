const mongoose = require('mongoose');

const paymentSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'main_settings',
      unique: true,
    },
    // D17 Recipient Details
    d17: {
      accountNumber: {
        type: String,
        default: '29845347',
        trim: true,
      },
      accountName: {
        type: String,
        default: 'HanGo Admin',
      },
      instructions: {
        type: String,
        default:
          '1. Open your D17 app.\n2. Choose "Transfert d\'argent" (Money Transfer).\n3. Send the exact amount to number: {accountNumber}.\n4. Enter your sender phone number/reference below and tap Continue.',
      },
      isEnabled: {
        type: Boolean,
        default: true,
      },
    },
    // Ooredoo Recipient Details
    ooredoo: {
      accountNumber: {
        type: String,
        default: '29845347',
        trim: true,
      },
      accountName: {
        type: String,
        default: 'HanGo Ooredoo',
      },
      instructions: {
        type: String,
        default:
          '1. Dial *120*{accountNumber}*{amount}# from your Ooredoo phone to transfer balance, OR recharge a voucher to this number.\n2. Once transferred, enter your phone number below and tap Continue.',
      },
      isEnabled: {
        type: Boolean,
        default: true,
      },
    },
    // Payeer Recipient Details
    payeer: {
      accountNumber: {
        type: String,
        default: 'P1084562143',
        trim: true,
      },
      accountName: {
        type: String,
        default: 'HanGo Payeer',
      },
      instructions: {
        type: String,
        default:
          '1. Open your Payeer wallet or app.\n2. Transfer exactly ${amount} USD to Payeer account: {accountNumber}.\n3. Copy the Batch / Transaction Operation ID.\n4. Enter your Payeer account and Transaction ID below and tap Continue.',
      },
      isEnabled: {
        type: Boolean,
        default: true,
      },
    },
    // Subscription Plans & Discount pricing
    plans: [
      {
        id: { type: String, required: true },
        durationMonths: { type: Number, required: true },
        title: { type: String, required: true },
        tag: { type: String },
        prices: {
          d17: { type: Number, required: true },
          ooredoo: { type: Number, required: true },
          payeer: { type: Number, required: true },
        },
      },
    ],
  },
  {
    timestamps: true,
    collection: 'payment_settings',
  }
);

module.exports =
  mongoose.models.PaymentSetting ||
  mongoose.model('PaymentSetting', paymentSettingSchema);
