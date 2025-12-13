import mongoose from "mongoose";

import { User } from "../models/model.login.js";
import Listener from "../models/model.listener.js";
import { Session } from "../models/model.session.js";
import Transaction from "../models/model.transaction.js";
import WithdrawRequest from "../models/model.withdrawRequest.js";
import SupportTicket from "../models/model.supportTicket.js";

const startOfDayUtc = (d) => {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

const addDaysUtc = (d, days) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
};

const startOfMonthUtc = (d) => {
  const x = new Date(d);
  x.setUTCDate(1);
  x.setUTCHours(0, 0, 0, 0);
  return x;
};

const addMonthsUtc = (d, months) => {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + months);
  return x;
};

const safePctChange = (current, previous) => {
  if (!previous || previous === 0) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const oidToDate = (id) => {
  try {
    return new mongoose.Types.ObjectId(id).getTimestamp();
  } catch {
    return null;
  }
};

export const getDashboard = async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days || "7", 10), 1), 90);
    const months = Math.min(Math.max(parseInt(req.query.months || "6", 10), 1), 24);
    const recentLimit = Math.min(
      Math.max(parseInt(req.query.recentLimit || "10", 10), 1),
      50
    );

    const now = new Date();

    const totalUsersPromise = User.countDocuments({
      role: "user",
      isDeleted: { $ne: true },
    });

    const activeListenersPromise = Listener.countDocuments({
      status: "approved",
      isDeleted: { $ne: true },
    });

    const liveSessionsPromise = Session.countDocuments({
      status: "ongoing",
      isDeleted: { $ne: true },
    });

    const openTicketsPromise = SupportTicket.countDocuments({
      status: { $in: ["open", "in_progress"] },
    });

    // Pending withdrawals = requested + processing
    const pendingWithdrawalsAggPromise = WithdrawRequest.aggregate([
      { $match: { status: { $in: ["requested", "processing"] } } },
      {
        $group: {
          _id: null,
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Monthly revenue (this month) + trend
    const monthStart = startOfMonthUtc(now);
    const nextMonthStart = addMonthsUtc(monthStart, 1);

    const monthlyRevenueAggPromise = Transaction.aggregate([
      {
        $match: {
          status: "completed",
          timestamp: { $gte: monthStart, $lt: nextMonthStart },
          // keep broad so it works with your existing data
          type: { $in: ["deposit", "session payment", "commission"] },
        },
      },
      { $group: { _id: null, revenue: { $sum: "$amount" } } },
    ]);

    const endPeriod = startOfDayUtc(now);
    const startPeriod = addDaysUtc(endPeriod, -days);
    const prevStartPeriod = addDaysUtc(startPeriod, -days);

    const newUsersCurrentPromise = User.countDocuments({
      role: "user",
      isDeleted: { $ne: true },
      registered: { $gte: startPeriod, $lt: endPeriod },
    });

    const newUsersPrevPromise = User.countDocuments({
      role: "user",
      isDeleted: { $ne: true },
      registered: { $gte: prevStartPeriod, $lt: startPeriod },
    });

    // Listeners created in period (using Listener.createdAt)
    const newListenersCurrentPromise = Listener.countDocuments({
      isDeleted: { $ne: true },
      createdAt: { $gte: startPeriod, $lt: endPeriod },
      status: "approved",
    });

    const newListenersPrevPromise = Listener.countDocuments({
      isDeleted: { $ne: true },
      createdAt: { $gte: prevStartPeriod, $lt: startPeriod },
      status: "approved",
    });

    const lastMonthStart = addMonthsUtc(monthStart, -1);
    const prevMonthStart = addMonthsUtc(monthStart, -2);

    const monthlyRevenuePrevAggPromise = Transaction.aggregate([
      {
        $match: {
          status: "completed",
          timestamp: { $gte: lastMonthStart, $lt: monthStart },
          type: { $in: ["deposit", "session payment", "commission"] },
        },
      },
      { $group: { _id: null, revenue: { $sum: "$amount" } } },
    ]);

    const monthlyRevenueTwoAgoAggPromise = Transaction.aggregate([
      {
        $match: {
          status: "completed",
          timestamp: { $gte: prevMonthStart, $lt: lastMonthStart },
          type: { $in: ["deposit", "session payment", "commission"] },
        },
      },
      { $group: { _id: null, revenue: { $sum: "$amount" } } },
    ]);

    const dailyStart = addDaysUtc(endPeriod, -days + 1);
    const dailyEndExclusive = addDaysUtc(endPeriod, 1);

    // Get active users (from User model - lastActive)
    const activeUsersPromise = User.aggregate([
      {
        $match: {
          lastActive: { $gte: dailyStart, $lt: dailyEndExclusive },
          isDeleted: { $ne: true },
          role: 'user'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$lastActive" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          day: "$_id",
          users: "$count"
        }
      }
    ]);

    // Get active listeners (from Session model - updatedAt)
    const dailyActiveListenersPromise = Session.aggregate([
      {
        $match: {
          updatedAt: { $gte: dailyStart, $lt: dailyEndExclusive },
          isDeleted: { $ne: true },
          status: { $ne: 'deleted' },
          listener: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
            listener: "$listener"
          }
        }
      },
      {
        $group: {
          _id: "$_id.day",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          day: "$_id",
          listeners: "$count"
        }
      }
    ]);

    // Execute both queries in parallel
    const [usersData, listenersData] = await Promise.all([activeUsersPromise, dailyActiveListenersPromise]);

    // Merge the results
    const allDays = new Set([
      ...usersData.map(u => u.day),
      ...listenersData.map(l => l.day)
    ]);

    const dailyActiveData = Array.from(allDays).map(day => {
      const userDay = usersData.find(u => u.day === day) || { users: 0 };
      const listenerDay = listenersData.find(l => l.day === day) || { listeners: 0 };

      return {
        day,
        users: userDay.users || 0,
        listeners: listenerDay.listeners || 0
      };
    }).sort((a, b) => new Date(a.day) - new Date(b.day));

    // Monthly revenue trend (last N months, inclusive of current month)
    const trendStart = addMonthsUtc(monthStart, -(months - 1));
    const trendEndExclusive = addMonthsUtc(monthStart, 1);

    const monthlyTrendAggPromise = Transaction.aggregate([
      {
        $match: {
          status: "completed",
          timestamp: { $gte: trendStart, $lt: trendEndExclusive },
          type: { $in: ["deposit", "session payment", "commission"] },
        },
      },
      {
        $group: {
          _id: {
            ym: {
              $dateToString: { format: "%Y-%m", date: "$timestamp" },
            },
          },
          revenue: { $sum: "$amount" },
        },
      },
      { $project: { _id: 0, ym: "$_id.ym", revenue: 1 } },
      { $sort: { ym: 1 } },
    ]);

    // Listener verification/status (based on Listener.status)
    const listenerStatusAggPromise = Listener.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Recent Activity (merged feed)
    const recentUsersPromise = User.find({ role: "user", isDeleted: { $ne: true } })
      .select("username phoneNumber registered")
      .sort({ registered: -1 })
      .limit(recentLimit)
      .lean();

    const recentSessionsPromise = Session.find({ isDeleted: { $ne: true } })
      .select("type startTime amount status")
      .sort({ startTime: -1 })
      .limit(recentLimit)
      .lean();

    const recentPaymentsPromise = Transaction.find({ status: "completed" })
      .select("type amount method timestamp")
      .sort({ timestamp: -1 })
      .limit(recentLimit)
      .lean();

    const recentTicketsPromise = SupportTicket.find({})
      .select("subject status priority")
      .sort({ _id: -1 })
      .limit(recentLimit)
      .lean();

    const [
      totalUsers,
      activeListeners,
      liveSessions,
      openTickets,
      pendingWithdrawalsAgg,
      monthlyRevenueAgg,
      newUsersCurrent,
      newUsersPrev,
      newListenersCurrent,
      newListenersPrev,
      monthlyRevenuePrevAgg,
      monthlyRevenueTwoAgoAgg,
      dailyActiveAgg,
      monthlyTrendAgg,
      listenerStatusAgg,
      recentUsers,
      recentSessions,
      recentPayments,
      recentTickets,
    ] = await Promise.all([
      totalUsersPromise,
      activeListenersPromise,
      liveSessionsPromise,
      openTicketsPromise,
      pendingWithdrawalsAggPromise,
      monthlyRevenueAggPromise,
      newUsersCurrentPromise,
      newUsersPrevPromise,
      newListenersCurrentPromise,
      newListenersPrevPromise,
      monthlyRevenuePrevAggPromise,
      monthlyRevenueTwoAgoAggPromise,
      // activeUsersPromise and activeListenersPromise are already executed above
      monthlyTrendAggPromise,
      listenerStatusAggPromise,
      recentUsersPromise,
      recentSessionsPromise,
      recentPaymentsPromise,
      recentTicketsPromise,
    ]);

    const pendingWithdrawals = pendingWithdrawalsAgg?.[0] || { amount: 0, count: 0 };
    const monthlyRevenue = monthlyRevenueAgg?.[0]?.revenue || 0;
    const lastMonthRevenue = monthlyRevenuePrevAgg?.[0]?.revenue || 0;
    const twoAgoMonthRevenue = monthlyRevenueTwoAgoAgg?.[0]?.revenue || 0;

    // Cards deltas
    const totalUsersDeltaPct = safePctChange(newUsersCurrent, newUsersPrev);
    const activeListenersDeltaPct = safePctChange(newListenersCurrent, newListenersPrev);
    const monthlyRevenueDeltaPct = safePctChange(lastMonthRevenue, twoAgoMonthRevenue);

    // Daily series fill
    const dailyMap = new Map(dailyActiveData.map((x) => [x.day, x]));
    const dailyLabels = [];
    const dailyUsers = [];
    const dailyListeners = [];

    for (let i = 0; i < days; i++) {
      const day = addDaysUtc(dailyStart, i);
      const key = day.toISOString().slice(0, 10);
      dailyLabels.push(key);
      const hit = dailyMap.get(key);
      dailyUsers.push(hit?.users || 0);
      dailyListeners.push(hit?.listeners || 0);
    }

    // Monthly trend fill
    const trendMap = new Map(monthlyTrendAgg.map((x) => [x.ym, x.revenue]));
    const monthlyLabels = [];
    const monthlyRevenues = [];

    for (let i = 0; i < months; i++) {
      const m = addMonthsUtc(trendStart, i);
      const ym = m.toISOString().slice(0, 7);
      monthlyLabels.push(ym);
      monthlyRevenues.push(trendMap.get(ym) || 0);
    }

    // Listener status object
    const listenerStatus = { pending: 0, approved: 0, suspended: 0 };
    for (const row of listenerStatusAgg) {
      if (row._id && listenerStatus[row._id] !== undefined) listenerStatus[row._id] = row.count;
    }

    // Recent activity merge
    const activity = [];

    for (const u of recentUsers) {
      activity.push({
        type: "user_registered",
        title: "New user registered",
        createdAt: u.registered,
        meta: {
          userId: u._id,
          username: u.username,
          phoneNumber: u.phoneNumber,
        },
      });
    }

    for (const s of recentSessions) {
      activity.push({
        type: "session_started",
        title: "New session started",
        createdAt: s.startTime,
        meta: {
          sessionId: s._id,
          sessionType: s.type,
          status: s.status,
          amount: s.amount,
        },
      });
    }

    for (const p of recentPayments) {
      activity.push({
        type: "payment_received",
        title: "Payment received",
        createdAt: p.timestamp,
        meta: {
          transactionId: p._id,
          paymentType: p.type,
          method: p.method,
          amount: p.amount,
        },
      });
    }

    // Replace the recentTickets loop with this safer version
    if (Array.isArray(recentTickets)) {
      for (const t of recentTickets) {
        activity.push({
          type: "ticket_created",
          title: "New support ticket",
          createdAt: oidToDate(t._id),
          meta: {
            ticketId: t._id,
            subject: t.subject,
            status: t.status,
            priority: t.priority,
          },
        });
      }
    }

    activity.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    const recentActivity = activity.slice(0, recentLimit);

    return res.status(200).json({
      success: true,
      data: {
        cards: {
          totalUsers: {
            value: totalUsers,
            deltaPct: Number(totalUsersDeltaPct.toFixed(2)),
            compareWindowDays: days,
          },
          activeListeners: {
            value: activeListeners,
            deltaPct: Number(activeListenersDeltaPct.toFixed(2)),
            compareWindowDays: days,
          },
          liveSessions: {
            value: liveSessions,
          },
          monthlyRevenue: {
            value: monthlyRevenue,
            deltaPct: Number(monthlyRevenueDeltaPct.toFixed(2)),
            // delta is last month vs month before last
            compareWindow: {
              from: lastMonthStart,
              to: monthStart,
            },
          },
          pendingWithdrawals: {
            value: pendingWithdrawals.amount,
            pendingCount: pendingWithdrawals.count,
          },
          openTickets: {
            value: openTickets,
          },
        },
        charts: {
          dailyActive: {
            labels: dailyLabels,
            users: dailyUsers,
            listeners: dailyListeners,
            from: dailyStart,
            to: dailyEndExclusive,
          },
          monthlyRevenueTrend: {
            labels: monthlyLabels,
            revenue: monthlyRevenues,
            from: trendStart,
            to: trendEndExclusive,
          },
          listenerStatus,
        },
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard data",
      error: error.message,
    });
  }
};
