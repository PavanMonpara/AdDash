import ExcelJS from 'exceljs';
import moment from 'moment';
import Transaction from '../models/model.transaction.js';
import { User } from '../models/model.login.js';
import { Session } from '../models/model.session.js';
import Listener from '../models/model.listener.js';
import { validationResult } from 'express-validator';

function getMonthName(monthIndex) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthIndex];
}

// Validation middleware for yearly report
export const validateYearlyReport = [
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Validation error',
                errors: errors.array()
            });
        }
        next();
    }
];

export async function generateYearlyReport(req, res) {
    try {
        const { year = new Date().getFullYear() } = req.query;
        
        // Validate year parameter
        const currentYear = new Date().getFullYear();
        const minYear = 2020; // Adjust based on your application's history
        
        if (!year || isNaN(year) || year < minYear || year > currentYear + 1) {
            return res.status(400).json({ 
                success: false, 
                message: `Year must be a valid year between ${minYear} and ${currentYear + 1}` 
            });
        }

        const monthsData = [];
        const startOfYear = moment([year]).startOf('year').toDate();
        const endOfYear = moment([year]).endOf('year').toDate();

        // Initialize monthly data structure
        const monthlyData = Array(12).fill().map((_, i) => {
            const monthStart = moment([year, i]).startOf('month').toDate();
            const monthEnd = moment(monthStart).endOf('month').toDate();
            return {
                month: getMonthName(i),
                monthNumber: i + 1,
                startDate: monthStart,
                endDate: monthEnd,
                users: [],
                listeners: [],
                transactions: [],
                sessions: []
            };
        });

        // Get all data for the year
        const [users, listeners, transactions, sessions] = await Promise.all([
            User.find({ 
                role: "user",
                registered: { $gte: startOfYear, $lte: endOfYear }
            }).select('-password -tokens -__v'),
            Listener.find({
                createdAt: { $gte: startOfYear, $lte: endOfYear }
            }).select('-password -tokens -__v'),
            Transaction.find({
                createdAt: { $gte: startOfYear, $lte: endOfYear },
            }).populate('user recipient session'),
            Session.find({
                startTime: { $gte: startOfYear, $lte: endOfYear }
            }).populate('user listener')
        ]);

        // Process data month by month
        monthlyData.forEach(monthData => {
            // Filter users who registered in this month
            monthData.users = users.filter(user => 
                moment(user.registered).isBetween(monthData.startDate, monthData.endDate, null, '[]')
            );

            // Filter listeners who were created in this month
            monthData.listeners = listeners.filter(listener => 
                moment(listener.createdAt).isBetween(monthData.startDate, monthData.endDate, null, '[]')
            );

            // Filter transactions for this month
            monthData.transactions = transactions.filter(tx => 
                moment(tx.createdAt).isBetween(monthData.startDate, monthData.endDate, null, '[]')
            );

            // Filter sessions for this month
            monthData.sessions = sessions.filter(session => 
                moment(session.startTime).isBetween(monthData.startDate, monthData.endDate, null, '[]')
            );

            // Calculate cumulative users and listeners
            const monthIndex = monthData.monthNumber - 1;
            const previousMonthsData = monthlyData.slice(0, monthIndex);
            
            // Calculate cumulative users (all users up to this month)
            monthData.cumulativeUsers = users.filter(user => 
                moment(user.registered).isSameOrBefore(monthData.endDate)
            ).length;

            // Calculate cumulative listeners (all listeners up to this month)
            monthData.cumulativeListeners = listeners.filter(listener => 
                moment(listener.createdAt).isSameOrBefore(monthData.endDate)
            ).length;

            // Calculate metrics
            const completedSessions = monthData.sessions.filter(s => s.status === 'completed').length;
            const cancelledSessions = monthData.sessions.filter(s => s.status === 'cancelled').length;
            const revenue = monthData.transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

            // Add metrics to month data
            monthData.metrics = {
                totalUsers: monthData.cumulativeUsers,
                newUsers: monthData.users.length,
                totalListeners: monthData.cumulativeListeners,
                newListeners: monthData.listeners.length,
                totalSessions: monthData.sessions.length,
                completedSessions,
                cancelledSessions,
                totalRevenue: revenue
            };
        });

        // Calculate yearly summary
        const yearlySummary = {
            totalUsers: users.length,
            totalListeners: listeners.length,
            totalSessions: sessions.length,
            completedSessions: sessions.filter(s => s.status === 'completed').length,
            cancelledSessions: sessions.filter(s => s.status === 'cancelled').length,
            totalRevenue: transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0)
        };

        const reportData = {
            year: parseInt(year),
            summary: yearlySummary,
            months: monthlyData.map(month => ({
                month: month.month,
                monthNumber: month.monthNumber,
                metrics: month.metrics,
                data: {
                    users: month.users,
                    listeners: month.listeners,
                    transactions: month.transactions, 
                    sessions: month.sessions
                }
            })),
            fullData: {
                users,
                listeners,
                transactions,
                sessions
            }
        };

        if (req.query.format === 'excel') {
            return exportYearlyToExcel(res, reportData);
        }

        res.status(200).json({
            success: true,
            data: reportData
        });

    } catch (error) {
        console.error('Error generating yearly report:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Failed to generate report',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

export default {
    generateYearlyReport,
};