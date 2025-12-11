import { User } from "../models/model.login.js";
import Listener from "../models/model.listener.js";
import { Session } from "../models/model.session.js";

// Soft delete user
const softDeleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason = 'No reason provided' } = req.body || {};
        
        const user = await User.softDelete(id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'User soft deleted successfully',
            data: user
        });
    } catch (error) {
        console.error('Error soft deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Error soft deleting user',
            error: error.message
        });
    }
};

// Restore soft-deleted user
const restoreUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        const user = await User.restore(id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found or already restored'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'User restored successfully',
            data: user
        });
    } catch (error) {
        console.error('Error restoring user:', error);
        res.status(500).json({
            success: false,
            message: 'Error restoring user',
            error: error.message
        });
    }
};

// Soft delete listener
const softDeleteListener = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason = 'No reason provided' } = req.body || {};
        
        const listener = await Listener.softDelete(id);
        
        if (!listener) {
            return res.status(404).json({
                success: false,
                message: 'Listener not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Listener soft deleted successfully',
            data: listener
        });
    } catch (error) {
        console.error('Error soft deleting listener:', error);
        res.status(500).json({
            success: false,
            message: 'Error soft deleting listener',
            error: error.message
        });
    }
};

// Restore soft-deleted listener
const restoreListener = async (req, res) => {
    try {
        const { id } = req.params;
        
        const listener = await Listener.restore(id);
        
        if (!listener) {
            return res.status(404).json({
                success: false,
                message: 'Listener not found or already restored'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Listener restored successfully',
            data: listener
        });
    } catch (error) {
        console.error('Error restoring listener:', error);
        res.status(500).json({
            success: false,
            message: 'Error restoring listener',
            error: error.message
        });
    }
};

// Soft delete session
const softDeleteSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason = 'No reason provided', deletedBy } = req.body || {};
        
        if (!req.body) {
            return res.status(400).json({
                success: false,
                message: 'Request body is required'
            });
        }
        
        if (!deletedBy || !deletedBy.userType || !deletedBy.userId) {
            return res.status(400).json({
                success: false,
                message: 'Deleter information (userType and userId) is required'
            });
        }
        
        const session = await Session.softDelete(id, {
            userType: deletedBy.userType,
            userId: deletedBy.userId,
            reason: reason
        });
        
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Session soft deleted successfully',
            data: session
        });
    } catch (error) {
        console.error('Error soft deleting session:', error);
        res.status(500).json({
            success: false,
            message: 'Error soft deleting session',
            error: error.message
        });
    }
};

// Restore soft-deleted session
const restoreSession = async (req, res) => {
    try {
        const { id } = req.params;
        
        const session = await Session.restore(id);
        
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found or already restored'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Session restored successfully',
            data: session
        });
    } catch (error) {
        console.error('Error restoring session:', error);
        res.status(500).json({
            success: false,
            message: 'Error restoring session',
            error: error.message
        });
    }
};

// Get deleted items
const getDeletedItems = async (req, res) => {
    try {
        const { type } = req.params;
        let deletedItems;
        
        switch (type.toLowerCase()) {
            case 'users':
                deletedItems = await User.find({ isDeleted: true }).exec();
                break;
            case 'listeners':
                deletedItems = await Listener.find({ isDeleted: true }).exec();
                break;
            case 'sessions':
                deletedItems = await Session.find({ isDeleted: true }).exec();
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid type. Must be one of: users, listeners, sessions'
                });
        }
        
        res.status(200).json({
            success: true,
            count: deletedItems.length,
            data: deletedItems
        });
    } catch (error) {
        console.error('Error fetching deleted items:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching deleted items',
            error: error.message
        });
    }
};

export {
    softDeleteUser,
    restoreUser,
    softDeleteListener,
    restoreListener,
    softDeleteSession,
    restoreSession,
    getDeletedItems
};
