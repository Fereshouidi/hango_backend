const { Notification, User } = require('../models');

/**
 * POST /api/notifications/admin/send
 * Admin sends a notification to selected audience or individual users
 */
async function sendNotification(req, res) {
  try {
    const { title, message, type = 'announcement', targetType = 'all', recipientIds = [] } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Notification title is required.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Notification message is required.' });
    }

    const validTypes = ['announcement', 'update', 'promo', 'alert', 'general'];
    const validType = validTypes.includes(type) ? type : 'announcement';

    const validTargets = ['all', 'subscribers', 'free', 'individual'];
    const validTarget = validTargets.includes(targetType) ? targetType : 'all';

    let count = 0;
    let cleanRecipientIds = [];

    if (validTarget === 'all') {
      count = await User.countDocuments();
    } else if (validTarget === 'subscribers') {
      count = await User.countDocuments({ isSubscribed: true });
    } else if (validTarget === 'free') {
      count = await User.countDocuments({ isSubscribed: { $ne: true } });
    } else if (validTarget === 'individual') {
      if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
        return res.status(400).json({
          error: 'Please select at least one recipient user for individual notifications.',
        });
      }
      cleanRecipientIds = recipientIds.map((id) => String(id).trim()).filter(Boolean);
      count = cleanRecipientIds.length;
    }

    const notification = await Notification.create({
      title: title.trim(),
      message: message.trim(),
      type: validType,
      targetType: validTarget,
      recipientIds: cleanRecipientIds,
      recipientsCount: count,
      readBy: [],
      sentBy: 'admin',
    });

    res.status(201).json({
      message: 'Notification sent successfully!',
      notification,
    });
  } catch (error) {
    console.error('[SendNotification Error]', error);
    res.status(500).json({ error: 'Failed to send notification: ' + error.message });
  }
}

/**
 * GET /api/notifications/admin/all
 * Admin fetches history of all sent notifications
 */
async function getAllNotifications(req, res) {
  try {
    const notifications = await Notification.find()
      .populate('recipientIds', 'email username')
      .sort({ createdAt: -1 })
      .limit(100);

    const formatted = notifications.map((n) => ({
      _id: n._id,
      title: n.title,
      message: n.message,
      type: n.type,
      targetType: n.targetType,
      recipientsCount: n.recipientsCount,
      recipientIds: n.recipientIds,
      readCount: Array.isArray(n.readBy) ? n.readBy.length : 0,
      createdAt: n.createdAt,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('[GetAllNotifications Error]', error);
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
}

/**
 * DELETE /api/notifications/admin/:id
 * Admin deletes a notification
 */
async function deleteNotification(req, res) {
  try {
    const { id } = req.params;
    const deleted = await Notification.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    res.json({ message: 'Notification deleted successfully!', id });
  } catch (error) {
    console.error('[DeleteNotification Error]', error);
    res.status(500).json({ error: 'Failed to delete notification.' });
  }
}

/**
 * GET /api/notifications
 * App user fetches their relevant notifications (20 per page)
 */
async function getUserNotifications(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const userId = req.user?.userId;
    let query;

    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        query = {
          $or: [
            { targetType: 'all' },
            ...(user.isSubscribed ? [{ targetType: 'subscribers' }] : [{ targetType: 'free' }]),
            { targetType: 'individual', recipientIds: userId },
          ],
        };
      } else {
        query = { targetType: 'all' };
      }
    } else {
      query = { targetType: 'all' };
    }

    const [total, notifications, unreadCount] = await Promise.all([
      Notification.countDocuments(query),
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      userId
        ? Notification.countDocuments({
            ...query,
            readBy: { $ne: userId },
          })
        : 0,
    ]);

    const result = notifications.map((n) => ({
      _id: n._id,
      title: n.title,
      message: n.message,
      type: n.type,
      targetType: n.targetType,
      isRead: userId
        ? Array.isArray(n.readBy) && n.readBy.some((r) => r.toString() === userId.toString())
        : false,
      createdAt: n.createdAt,
    }));

    res.json({
      notifications: result,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + result.length < total,
        unreadCount,
      },
    });
  } catch (error) {
    console.error('[GetUserNotifications Error]', error);
    res.status(500).json({ error: 'Failed to fetch user notifications.' });
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read by current app user
 */
async function markAsRead(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const { id } = req.params;

    await Notification.findByIdAndUpdate(id, {
      $addToSet: { readBy: userId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[MarkAsRead Error]', error);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
}

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for current app user
 */
async function markAllAsRead(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const user = await User.findById(userId);
    const query = {
      $or: [
        { targetType: 'all' },
        ...(user?.isSubscribed ? [{ targetType: 'subscribers' }] : [{ targetType: 'free' }]),
        { targetType: 'individual', recipientIds: userId },
      ],
    };

    await Notification.updateMany(query, {
      $addToSet: { readBy: userId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[MarkAllAsRead Error]', error);
    res.status(500).json({ error: 'Failed to mark all as read.' });
  }
}

module.exports = {
  sendNotification,
  getAllNotifications,
  deleteNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};
