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
      usdt: {
        accountNumber: config.PAYMENT_CONFIG.usdt?.accountNumber || 'TXYZ1234567890abcdef',
        accountName: 'HanGo USDT',
        instructions: config.PAYMENT_CONFIG.usdt?.instructions,
        isEnabled: true,
      },
      binance: {
        accountNumber: config.PAYMENT_CONFIG.binance?.accountNumber || '105847392',
        accountName: 'HanGo Binance Pay',
        instructions: config.PAYMENT_CONFIG.binance?.instructions,
        isEnabled: true,
      },
      plans: config.SUBSCRIPTION_PLANS,
    });
  } else {
    let needsSave = false;
    if (!settings.usdt) {
      settings.usdt = {
        accountNumber: config.PAYMENT_CONFIG.usdt?.accountNumber || 'TXYZ1234567890abcdef',
        accountName: 'HanGo USDT',
        instructions: config.PAYMENT_CONFIG.usdt?.instructions,
        isEnabled: true,
      };
      needsSave = true;
    }
    if (!settings.binance) {
      settings.binance = {
        accountNumber: config.PAYMENT_CONFIG.binance?.accountNumber || '105847392',
        accountName: 'HanGo Binance Pay',
        instructions: config.PAYMENT_CONFIG.binance?.instructions,
        isEnabled: true,
      };
      needsSave = true;
    }
    if (needsSave) {
      await settings.save().catch(() => {});
    }
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
        usdt: settings.usdt,
        binance: settings.binance,
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
    const { d17, ooredoo, payeer, usdt, binance, plans } = req.body;
    const settings = await getPaymentSettingsDoc();

    if (d17) {
      if (d17.accountNumber !== undefined) settings.d17.accountNumber = String(d17.accountNumber).trim();
      if (d17.accountName !== undefined) settings.d17.accountName = d17.accountName;
      if (d17.instructions !== undefined) settings.d17.instructions = d17.instructions;
      if (d17.isEnabled !== undefined) settings.d17.isEnabled = Boolean(d17.isEnabled);
      settings.markModified('d17');
    }

    if (ooredoo) {
      if (ooredoo.accountNumber !== undefined) settings.ooredoo.accountNumber = String(ooredoo.accountNumber).trim();
      if (ooredoo.accountName !== undefined) settings.ooredoo.accountName = ooredoo.accountName;
      if (ooredoo.instructions !== undefined) settings.ooredoo.instructions = ooredoo.instructions;
      if (ooredoo.isEnabled !== undefined) settings.ooredoo.isEnabled = Boolean(ooredoo.isEnabled);
      settings.markModified('ooredoo');
    }

    if (payeer) {
      if (payeer.accountNumber !== undefined) settings.payeer.accountNumber = String(payeer.accountNumber).trim();
      if (payeer.accountName !== undefined) settings.payeer.accountName = payeer.accountName;
      if (payeer.instructions !== undefined) settings.payeer.instructions = payeer.instructions;
      if (payeer.isEnabled !== undefined) settings.payeer.isEnabled = Boolean(payeer.isEnabled);
      settings.markModified('payeer');
    }

    if (usdt) {
      if (!settings.usdt) settings.usdt = {};
      if (usdt.accountNumber !== undefined) settings.usdt.accountNumber = String(usdt.accountNumber).trim();
      if (usdt.accountName !== undefined) settings.usdt.accountName = usdt.accountName;
      if (usdt.instructions !== undefined) settings.usdt.instructions = usdt.instructions;
      if (usdt.isEnabled !== undefined) settings.usdt.isEnabled = Boolean(usdt.isEnabled);
      settings.markModified('usdt');
    }

    if (binance) {
      if (!settings.binance) settings.binance = {};
      if (binance.accountNumber !== undefined) settings.binance.accountNumber = String(binance.accountNumber).trim();
      if (binance.accountName !== undefined) settings.binance.accountName = binance.accountName;
      if (binance.instructions !== undefined) settings.binance.instructions = binance.instructions;
      if (binance.isEnabled !== undefined) settings.binance.isEnabled = Boolean(binance.isEnabled);
      settings.markModified('binance');
    }

    if (Array.isArray(plans) && plans.length > 0) {
      settings.plans = plans;
      settings.markModified('plans');
    }

    await settings.save();

    res.json({
      message: 'Payment recipient settings updated successfully!',
      settings: {
        d17: settings.d17,
        ooredoo: settings.ooredoo,
        payeer: settings.payeer,
        usdt: settings.usdt,
        binance: settings.binance,
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
    if (!['d17', 'ooredoo', 'payeer', 'usdt', 'binance'].includes(cleanMethod)) {
      return res.status(400).json({
        error: 'Invalid payment method. Choose "d17", "ooredoo", "payeer", "usdt", or "binance".',
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

    const isUsdMethod = ['payeer', 'usdt', 'binance'].includes(cleanMethod);
    const price = plan.prices[cleanMethod] ?? (isUsdMethod ? (plan.prices.usdt ?? plan.prices.payeer) : plan.prices.d17);
    const currency = isUsdMethod ? '$' : 'DT';

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
 * Priority order:
 *  1. User explicitly revoked/cancelled by admin → NOT subscribed
 *  2. User has active subscriptionExpiresAt > now (honours manual admin grants & extensions) → SUBSCRIBED
 *  3. Latest APPROVED payment has not expired → SUBSCRIBED
 *  4. Default → NOT subscribed / expired
 */
async function getUserSubscriptionStatus(req, res) {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const now = new Date();

    const latestActionedPayment = await Payment.findOne({
      userId,
      status: { $in: ['approved', 'rejected', 'cancelled'] },
    }).sort({ updatedAt: -1, createdAt: -1 });

    let isSubscribed = false;

    // ── 1. If user is explicitly cancelled/revoked by admin, NEVER resurrect via old payment ──
    if (
      user.subscriptionStatus === 'cancelled' ||
      user.subscriptionStatus === 'canceled'
    ) {
      isSubscribed = false;
      user.isSubscribed = false;
      await user.save();
    }
    // ── 2. If user has active subscriptionExpiresAt in future (admin grant or extension) ────
    else if (
      user.isSubscribed &&
      user.subscriptionExpiresAt &&
      new Date(user.subscriptionExpiresAt) > now
    ) {
      isSubscribed = true;
      user.subscriptionStatus = 'active';
      await user.save();
    }
    // ── 3. Check latest approved payment ───────────────────────────────────────────────────
    else if (latestActionedPayment && latestActionedPayment.status === 'approved') {
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
        if (
          !user.subscriptionExpiresAt ||
          new Date(user.subscriptionExpiresAt) < new Date(expiresAt)
        ) {
          user.subscriptionExpiresAt = expiresAt;
        }
        user.subscriptionPlan = `${latestActionedPayment.durationMonths || 1}_month`;
        await user.save();
      } else {
        isSubscribed = false;
        user.isSubscribed = false;
        user.subscriptionStatus = 'expired';
        await user.save();
      }
    }
    // ── 4. Fallback: Not subscribed or expired ─────────────────────────────────────────────
    else {
      isSubscribed = false;
      user.isSubscribed = false;
      if (
        user.subscriptionExpiresAt &&
        new Date(user.subscriptionExpiresAt) <= now
      ) {
        user.subscriptionStatus = 'expired';
      } else if (
        !user.subscriptionStatus ||
        user.subscriptionStatus === 'active'
      ) {
        user.subscriptionStatus = 'none';
      }
      await user.save();
    }

    // Always separately surface any pending (under-review) payment
    const pendingPayment = await Payment.findOne({
      userId,
      status: 'pending',
    }).sort({ createdAt: -1 });

    // Surface the most-recent rejected payment so the user can see the reason
    const latestRejectedPayment = await Payment.findOne({
      userId,
      status: 'rejected',
    }).sort({ reviewedAt: -1, updatedAt: -1 });

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
      latestRejectedPayment: latestRejectedPayment
        ? {
            _id: latestRejectedPayment._id,
            method: latestRejectedPayment.method,
            durationMonths: latestRejectedPayment.durationMonths,
            amount: latestRejectedPayment.amount,
            currency: latestRejectedPayment.currency,
            status: 'rejected',
            rejectionReason: latestRejectedPayment.rejectionReason || null,
            reviewedAt: latestRejectedPayment.reviewedAt,
            createdAt: latestRejectedPayment.createdAt,
          }
        : null,
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

/**
 * GET /api/payments/admin/stats
 * Admin: Get dashboard analytics, revenue, and counts
 */
async function getAdminStats(req, res) {
  try {
    const now = new Date();

    const pendingCount = await Payment.countDocuments({ status: 'pending' });
    const approvedCount = await Payment.countDocuments({ status: 'approved' });
    const rejectedCount = await Payment.countDocuments({ status: 'rejected' });
    const totalPayments = await Payment.countDocuments();

    const approvedPayments = await Payment.find({ status: 'approved' });
    let totalRevenueDT = 0;
    let totalRevenueUSD = 0;

    for (const p of approvedPayments) {
      if (p.currency === '$' || ['payeer', 'usdt', 'binance'].includes(p.method)) {
        totalRevenueUSD += Number(p.amount) || 0;
      } else {
        totalRevenueDT += Number(p.amount) || 0;
      }
    }

    const activeSubscribers = await User.countDocuments({
      isSubscribed: true,
      subscriptionExpiresAt: { $gt: now },
    });
    const totalUsers = await User.countDocuments();

    res.json({
      pendingCount,
      approvedCount,
      rejectedCount,
      totalPayments,
      totalRevenueDT: Number(totalRevenueDT.toFixed(2)),
      totalRevenueUSD: Number(totalRevenueUSD.toFixed(2)),
      activeSubscribers,
      totalUsers,
      updatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('[GetAdminStats Error]', error);
    res.status(500).json({ error: 'Failed to retrieve admin stats.' });
  }
}

/**
 * GET /api/payments/admin/users
 * Admin: List all users with subscription details
 */
async function getAdminUsers(req, res) {
  try {
    const { search } = req.query;
    let query = {};
    if (search && search.trim()) {
      const term = search.trim();
      query = {
        $or: [
          { email: { $regex: term, $options: 'i' } },
          { username: { $regex: term, $options: 'i' } },
        ],
      };
    }

    const users = await User.find(query)
      .select(
        'email username isSubscribed subscriptionStatus subscriptionExpiresAt subscriptionPlan appVersion platform createdAt lastLoginAt'
      )
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(users);
  } catch (error) {
    console.error('[GetAdminUsers Error]', error);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
}

/**
 * POST /api/payments/admin/users/:id/subscription
 * Admin: Manually grant/extend or revoke a user's subscription
 */
async function updateUserSubscriptionAdmin(req, res) {
  try {
    const { id } = req.params;
    const { action, durationMonths } = req.body; // action: 'grant' | 'revoke'

    let user = null;
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user) {
      user = await User.findOne({ email: id });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const now = new Date();

    if (action === 'grant') {
      const months = Number(durationMonths) || 1;
      let baseDate = now;
      if (
        user.isSubscribed &&
        user.subscriptionExpiresAt &&
        new Date(user.subscriptionExpiresAt) > now
      ) {
        baseDate = new Date(user.subscriptionExpiresAt);
      }
      const expiresAt = new Date(baseDate);
      expiresAt.setDate(expiresAt.getDate() + months * 30);

      user.isSubscribed = true;
      user.subscriptionStatus = 'active';
      user.subscriptionExpiresAt = expiresAt;
      user.subscriptionPlan = `${months}_month_manual`;
      await user.save();

      // Synchronize Payment collection so payment history and status checks align
      const latestApproved = await Payment.findOne({
        userId: user._id,
        status: 'approved',
      }).sort({ updatedAt: -1, createdAt: -1 });

      if (latestApproved) {
        latestApproved.subscriptionExpiresAt = expiresAt;
        latestApproved.durationMonths = (latestApproved.durationMonths || 0) + months;
        latestApproved.notes = `${latestApproved.notes || ''} | Extended by ${months} mo by admin`.trim();
        await latestApproved.save();
      } else {
        await Payment.create({
          userId: user._id,
          userEmail: user.email,
          username: user.username,
          method: 'd17',
          durationMonths: months,
          amount: 0,
          currency: 'DT',
          recipientAccount: 'Admin Manual Grant',
          senderReference: `ADMIN-GRANT-${Date.now()}`,
          notes: `Manually granted by admin for ${months} month(s)`,
          status: 'approved',
          reviewedAt: now,
          subscriptionStartedAt: baseDate,
          subscriptionExpiresAt: expiresAt,
        });
      }

      return res.json({
        message: `Subscription successfully granted until ${expiresAt.toLocaleDateString()}.`,
        user: {
          id: user._id,
          email: user.email,
          isSubscribed: user.isSubscribed,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionExpiresAt: user.subscriptionExpiresAt,
        },
      });
    } else if (action === 'revoke') {
      user.isSubscribed = false;
      user.subscriptionStatus = 'cancelled';
      user.subscriptionExpiresAt = now;
      await user.save();

      // Cancel ALL approved and pending payments for this user so they cannot resurrect the subscription!
      await Payment.updateMany(
        { userId: user._id, status: { $in: ['approved', 'pending'] } },
        {
          $set: {
            status: 'cancelled',
            subscriptionExpiresAt: now,
            rejectionReason: 'Revoked by admin',
          },
        }
      );

      return res.json({
        message: `Subscription for ${user.email} has been revoked.`,
        user: {
          id: user._id,
          email: user.email,
          isSubscribed: user.isSubscribed,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionExpiresAt: user.subscriptionExpiresAt,
        },
      });
    } else {
      return res
        .status(400)
        .json({ error: 'Invalid action. Choose "grant" or "revoke".' });
    }
  } catch (error) {
    console.error('[UpdateUserSubscriptionAdmin Error]', error);
    res.status(500).json({ error: 'Failed to update user subscription.' });
  }
}

/**
 * DELETE /api/payments/admin/:id
 * Admin: Delete a payment record
 */
async function deletePaymentAdmin(req, res) {
  try {
    const { id } = req.params;
    const payment = await Payment.findByIdAndDelete(id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }
    res.json({ message: 'Payment record deleted.', paymentId: id });
  } catch (error) {
    console.error('[DeletePaymentAdmin Error]', error);
    res.status(500).json({ error: 'Failed to delete payment.' });
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
  getAdminStats,
  getAdminUsers,
  updateUserSubscriptionAdmin,
  deletePaymentAdmin,
};
