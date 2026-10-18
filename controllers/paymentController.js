const config = require('../config');
const { User, Payment, PaymentSetting } = require('../models');

/**
 * Helper to get or initialize payment settings from MongoDB
 */
async function getPaymentSettingsDoc() {
  let settings = await PaymentSetting.findOne({ key: 'main_settings' });

  if (!settings) {
    settings = await PaymentSetting.create({
      key: 'main_settings',
      d17: {
        accountNumber: config.PAYMENT_CONFIG.d17.accountNumber || '29845347',
        accountName: 'HanGo D17',
        instructions: config.PAYMENT_CONFIG.d17.instructions,
        isEnabled: true,
      },
      ooredoo: {
        accountNumber: config.PAYMENT_CONFIG.ooredoo.accountNumber || '29845347',
        accountName: 'HanGo Ooredoo',
        instructions: config.PAYMENT_CONFIG.ooredoo.instructions,
        isEnabled: true,
      },
      payeer: {
        accountNumber: config.PAYMENT_CONFIG.payeer.accountNumber || 'P1084562143',
        accountName: 'HanGo Payeer',
        instructions: config.PAYMENT_CONFIG.payeer.instructions,
        isEnabled: true,
      },
      plans: config.SUBSCRIPTION_PLANS,
    });
  }

  return settings;
}

/**
 * GET /api/payments/plans
 * Public endpoint to fetch active plans, payment methods, and recipient numbers
 */
async function getPlansAndMethods(req, res) {
  try {
    const settings = await getPaymentSettingsDoc();

    res.json({
      methods: {
        d17: settings.d17,
        ooredoo: settings.ooredoo,
        payeer: settings.payeer,
      },
      plans: settings.plans,
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.error('[GetPlansAndMethods Error]', error);
    res.status(500).json({ error: 'Failed to retrieve payment plans.' });
  }
}

/**
 * PUT /api/payments/settings
 * Admin endpoint to update recipient phone numbers, Payeer accounts, and instructions in MongoDB
 */
async function updatePaymentSettings(req, res) {
  try {
    const { d17, ooredoo, payeer, plans } = req.body;
    const settings = await getPaymentSettingsDoc();

    if (d17) {
      if (d17.accountNumber !== undefined) settings.d17.accountNumber = String(d17.accountNumber).trim();
      if (d17.accountName !== undefined) settings.d17.accountName = d17.accountName;
      if (d17.instructions !== undefined) settings.d17.instructions = d17.instructions;
      if (d17.isEnabled !== undefined) settings.d17.isEnabled = Boolean(d17.isEnabled);
    }

    if (ooredoo) {
      if (ooredoo.accountNumber !== undefined) settings.ooredoo.accountNumber = String(ooredoo.accountNumber).trim();
      if (ooredoo.accountName !== undefined) settings.ooredoo.accountName = ooredoo.accountName;
      if (ooredoo.instructions !== undefined) settings.ooredoo.instructions = ooredoo.instructions;
      if (ooredoo.isEnabled !== undefined) settings.ooredoo.isEnabled = Boolean(ooredoo.isEnabled);
    }

    if (payeer) {
      if (payeer.accountNumber !== undefined) settings.payeer.accountNumber = String(payeer.accountNumber).trim();
      if (payeer.accountName !== undefined) settings.payeer.accountName = payeer.accountName;
      if (payeer.instructions !== undefined) settings.payeer.instructions = payeer.instructions;
      if (payeer.isEnabled !== undefined) settings.payeer.isEnabled = Boolean(payeer.isEnabled);
    }

    if (Array.isArray(plans) && plans.length > 0) {
      settings.plans = plans;
    }

    await settings.save();

    res.json({
      message: 'Payment recipient settings updated successfully!',
      settings: {
        d17: settings.d17,
        ooredoo: settings.ooredoo,
        payeer: settings.payeer,
        plans: settings.plans,
      },
    });
  } catch (error) {
    console.error('[UpdatePaymentSettings Error]', error);
    res.status(500).json({ error: 'Failed to update payment settings.' });
  }
}

/**
 * POST /api/payments/submit
 * User submits payment proof after sending money
 */
async function submitPayment(req, res) {
  try {
    const userId = req.user.userId;
    const { method, durationMonths, senderReference, notes } = req.body;

    if (!method || !durationMonths || !senderReference) {
      return res.status(400).json({
        error: 'Method, durationMonths, and senderReference are required.',
      });
    }

    const cleanMethod = method.toLowerCase().trim();
    if (!['d17', 'ooredoo', 'payeer'].includes(cleanMethod)) {
      return res.status(400).json({
        error: 'Invalid payment method. Choose "d17", "ooredoo", or "payeer".',
      });
    }

    const months = Number(durationMonths);
    const settings = await getPaymentSettingsDoc();

    // Check if method is enabled
    const methodConfig = settings[cleanMethod];
    if (!methodConfig || !methodConfig.isEnabled) {
      return res.status(400).json({
        error: `Payment method "${cleanMethod}" is currently disabled.`,
      });
    }

    // Find plan
    const plan = settings.plans.find((p) => p.durationMonths === months);
    if (!plan) {
      return res.status(400).json({
        error: `No plan found for duration ${months} month(s).`,
      });
    }

    const price = plan.prices[cleanMethod];
    const currency = cleanMethod === 'payeer' ? '$' : 'DT';

    // Prevent duplicate pending requests with the exact same reference
    const existingPending = await Payment.findOne({
      userId,
      status: 'pending',
      senderReference: senderReference.trim(),
    });

    if (existingPending) {
      return res.status(409).json({
        error: 'A pending payment with this reference is already under review.',
        payment: existingPending,
      });
    }

    const newPayment = await Payment.create({
      userId,
      userEmail: req.user.email,
      username: req.user.username,
      method: cleanMethod,
      durationMonths: months,
      amount: price,
      currency,
      recipientAccount: methodConfig.accountNumber,
      senderReference: senderReference.trim(),
      notes: notes ? notes.trim() : '',
      status: 'pending',
    });

    // Update user subscriptionStatus to 'pending' if not already active
    const user = await User.findById(userId);
    if (user && !user.isSubscribed) {
      user.subscriptionStatus = 'pending';
      await user.save();
    }

    res.status(201).json({
      message: 'Payment submitted successfully! Your subscription will start once approved by admin.',
      payment: newPayment,
    });
  } catch (error) {
    console.error('[SubmitPayment Error]', error);
    res.status(500).json({ error: 'Failed to submit payment.' });
  }
}

/**
 * GET /api/payments/status
 * Get the current user's active subscription status and any pending payment.
 *
 * Priority order (most authoritative → least):
 *  1. Latest APPROVED payment  → user is subscribed (until expiry)
 *  2. User document flagged as cancelled/expired → revoke subscription
 *  3. Latest REJECTED/CANCELLED payment → revoke subscription
 *  4. User document manually set isSubscribed:true → honour it
 *  5. Default → not subscribed
 *
 * A PENDING payment does NOT affect subscription state — it is only surfaced
 * separately so the UI can show "under review" messaging.
 */
async function getUserSubscriptionStatus(req, res) {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const now = new Date();

    // Fetch the most-recently-updated payment that is NOT pending.
    // This prevents a fresh pending submission from shadowing a previously
    // approved (or cancelled) payment record.
    const latestActionedPayment = await Payment.findOne({
      userId,
      status: { $in: ['approved', 'rejected', 'cancelled'] },
    }).sort({ updatedAt: -1, createdAt: -1 });

    let isSubscribed = false;

    // ── PRIORITY 1: Most recent approved payment ──────────────────────────
    if (latestActionedPayment && latestActionedPayment.status === 'approved') {
      const baseDate =
        latestActionedPayment.subscriptionStartedAt ||
        latestActionedPayment.reviewedAt ||
        latestActionedPayment.updatedAt ||
        latestActionedPayment.createdAt ||
        now;

      let expiresAt = latestActionedPayment.subscriptionExpiresAt;
      if (!expiresAt) {
        expiresAt = new Date(baseDate);
        expiresAt.setDate(
          expiresAt.getDate() + (latestActionedPayment.durationMonths || 1) * 30
        );
        latestActionedPayment.subscriptionStartedAt = baseDate;
        latestActionedPayment.subscriptionExpiresAt = expiresAt;
        await latestActionedPayment.save();
      }

      if (new Date(expiresAt) > now) {
        isSubscribed = true;
        user.isSubscribed = true;
        user.subscriptionStatus = 'active';
        user.subscriptionExpiresAt = expiresAt;
        user.subscriptionPlan = `${latestActionedPayment.durationMonths || 1}_month`;
        await user.save();
      } else {
        // Subscription window has elapsed
        isSubscribed = false;
        user.isSubscribed = false;
        user.subscriptionStatus = 'expired';
        user.subscriptionExpiresAt = expiresAt; // keep for display
        await user.save();
      }
    }
    // ── PRIORITY 2: Admin cancelled/rejected the payment ──────────────────
    else if (
      latestActionedPayment &&
      (latestActionedPayment.status === 'rejected' ||
        latestActionedPayment.status === 'cancelled')
    ) {
      isSubscribed = false;
      user.isSubscribed = false;
      user.subscriptionStatus = latestActionedPayment.status;
      user.subscriptionExpiresAt = null;
      await user.save();
    }
    // ── PRIORITY 3: User document explicitly not subscribed ───────────────
    else if (
      user.subscriptionStatus === 'cancelled' ||
      user.subscriptionStatus === 'expired'
    ) {
      isSubscribed = false;
      user.isSubscribed = false;
      await user.save();
    }
    // ── PRIORITY 4: Admin directly set isSubscribed:true on user doc ──────
    else if (user.isSubscribed === true) {
      if (!user.subscriptionExpiresAt) {
        const defaultExp = new Date();
        defaultExp.setDate(defaultExp.getDate() + 30);
        user.subscriptionExpiresAt = defaultExp;
        await user.save();
      }

      if (new Date(user.subscriptionExpiresAt) > now) {
        isSubscribed = true;
        user.subscriptionStatus = 'active';
        await user.save();
      } else {
        isSubscribed = false;
        user.isSubscribed = false;
        user.subscriptionStatus = 'expired';
        await user.save();
      }
    } else {
      // ── DEFAULT: not subscribed ─────────────────────────────────────────
      isSubscribed = false;
    }

    // Always separately surface any pending (under-review) payment
    const pendingPayment = await Payment.findOne({
      userId,
      status: 'pending',
    }).sort({ createdAt: -1 });

    let daysRemaining = 0;
    if (isSubscribed && user.subscriptionExpiresAt) {
      const diffMs =
        new Date(user.subscriptionExpiresAt).getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    res.json({
      isSubscribed,
      subscriptionStatus:
        user.subscriptionStatus || (isSubscribed ? 'active' : 'none'),
      subscriptionPlan: user.subscriptionPlan,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      daysRemaining,
      hasPendingPayment: Boolean(pendingPayment),
      pendingPayment: pendingPayment || null,
    });
  } catch (error) {
    console.error('[GetUserSubscriptionStatus Error]', error);
    res.status(500).json({ error: 'Failed to retrieve subscription status.' });
  }
}

/**
 * GET /api/payments/history
 * Fetch the user's past payment submissions
 */
async function getUserPaymentHistory(req, res) {
  try {
    const userId = req.user.userId;
    const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    console.error('[GetUserPaymentHistory Error]', error);
    res.status(500).json({ error: 'Failed to retrieve payment history.' });
  }
}

/**
 * GET /api/payments/admin/all
 * Admin: List all payments (filterable by status: ?status=pending)
 */
async function getAllPaymentsAdmin(req, res) {
  try {
    const { status } = req.query;
    const filter = status && status !== 'all' ? { status } : {};

    const payments = await Payment.find(filter).sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    console.error('[GetAllPaymentsAdmin Error]', error);
    res.status(500).json({ error: 'Failed to fetch payments.' });
  }
}

/**
 * POST /api/payments/admin/:id/approve
 * Admin: Approve a payment and activate/extend user subscription
 */
async function approvePaymentAdmin(req, res) {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    if (payment.status === 'approved') {
      return res.status(400).json({ error: 'This payment has already been approved.' });
    }

    const user = await User.findById(payment.userId);
    if (!user) {
      return res.status(404).json({ error: 'User associated with payment was not found.' });
    }

    const now = new Date();

    // If user currently has active unexpired subscription, extend from expiration date; otherwise from now
    let startDate = now;
    let baseDate = now;
    if (user.isSubscribed && user.subscriptionExpiresAt && user.subscriptionExpiresAt > now) {
      baseDate = new Date(user.subscriptionExpiresAt);
    }

    // Calculate expiration date based on durationMonths
    const expiresAt = new Date(baseDate);
    expiresAt.setDate(expiresAt.getDate() + payment.durationMonths * 30);

    // Update payment record
    payment.status = 'approved';
    payment.reviewedAt = now;
    payment.reviewedBy = 'admin';
    payment.subscriptionStartedAt = startDate;
    payment.subscriptionExpiresAt = expiresAt;
    payment.rejectionReason = null;
    await payment.save();

    // Update user subscription
    user.isSubscribed = true;
    user.subscriptionStatus = 'active';
    user.subscriptionExpiresAt = expiresAt;
    user.subscriptionPlan = `${payment.durationMonths}_month`;
    await user.save();

    console.log(
      `[Payment Approved] User ${user.email} subscription active until ${expiresAt.toISOString()}`
    );

    res.json({
      message: `Payment approved! Subscription for ${user.email} is active until ${expiresAt.toLocaleDateString()}.`,
      payment,
      subscription: {
        isSubscribed: user.isSubscribed,
        expiresAt: user.subscriptionExpiresAt,
        plan: user.subscriptionPlan,
      },
    });
  } catch (error) {
    console.error('[ApprovePaymentAdmin Error]', error);
    res.status(500).json({ error: 'Failed to approve payment.' });
  }
}

/**
 * POST /api/payments/admin/:id/reject
 * Admin: Reject a payment
 */
async function rejectPaymentAdmin(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    const now = new Date();
    payment.status = 'rejected';
    payment.reviewedAt = now;
    payment.reviewedBy = 'admin';
    payment.rejectionReason = reason || 'Payment could not be verified.';
    await payment.save();

    // Reset user pending status if they don't have active subscription
    const user = await User.findById(payment.userId);
    if (user && !user.isSubscribed) {
      user.subscriptionStatus = 'none';
      await user.save();
    }

    res.json({
      message: 'Payment rejected.',
      payment,
    });
  } catch (error) {
    console.error('[RejectPaymentAdmin Error]', error);
    res.status(500).json({ error: 'Failed to reject payment.' });
  }
}

module.exports = {
  getPlansAndMethods,
  updatePaymentSettings,
  submitPayment,
  getUserSubscriptionStatus,
  getUserPaymentHistory,
  getAllPaymentsAdmin,
  approvePaymentAdmin,
  rejectPaymentAdmin,
};
