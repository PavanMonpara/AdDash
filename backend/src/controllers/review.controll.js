import mongoose from 'mongoose';
import Review from '../models/model.review.js';

class ApiError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Create error response
const createError = (message, statusCode) => {
    return new ApiError(message, statusCode);
};

export const createReview = async (req, res, next) => {
    try {
        const { rating, comment } = req.body;
        const { listenerId } = req.params;
        
        // Check if user already reviewed this listener
        const existingReview = await Review.findOne({
            reviewer: req.user.id,
            listener: listenerId
        });

        if (existingReview) {
            return next(createError('You have already reviewed this listener', 400));
        }

        const review = await Review.create({
            reviewer: req.user.id,
            listener: listenerId,
            rating,
            comment
        });

        // Populate reviewer details
        await review.populate('reviewer', 'name profilePicture');

        res.status(201).json({
            success: true,
            data: review
        });
    } catch (err) {
        next(err);
    }
};

export const getListenerReviews = async (req, res, next) => {
    try {
        const { listenerId } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;

        // Get reviews with pagination
        const reviews = await Review.find({ listener: listenerId })
            .sort('-createdAt')
            .skip(startIndex)
            .limit(limit)
            .populate('reviewer', 'name profilePicture');

        // Get total count for pagination
        const total = await Review.countDocuments({ listener: listenerId });

        // Get average rating
        const avgRating = await Review.aggregate([
            { $match: { listener: new mongoose.Types.ObjectId(listenerId) } },
            { $group: { _id: null, averageRating: { $avg: '$rating' } } }
        ]);

        res.status(200).json({
            success: true,
            count: reviews.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            averageRating: avgRating[0]?.averageRating?.toFixed(1) || 0,
            data: reviews
        });
    } catch (err) {
        next(err);
    }
};

export const updateReview = async (req, res, next) => {
    try {
        let review = await Review.findById(req.params.id);

        if (!review) {
            return next(createError(`Review not found with id of ${req.params.id}`, 404));
        }

        // Only the review creator can update the review
        if (review.reviewer.toString() !== req.user.id) {
            return next(createError('Only the review creator can update this review', 403));
        }

        review = await Review.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).populate('reviewer', 'name profilePicture');

        res.status(200).json({
            success: true,
            data: review
        });
    } catch (err) {
        next(err);
    }
};

export const deleteReview = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return next(createError(`Review not found with id of ${req.params.id}`, 404));
        }

        // Only review creator or the listener can delete the review
        if (review.reviewer.toString() !== req.user.id && 
            review.listener.toString() !== req.user.id && 
            req.user.role !== 'admin') {
            return next(createError('You are not authorized to delete this review', 403));
        }

        await Review.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        next(err);
    }
};

export const getReview = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id)
            .populate('reviewer', 'name profilePicture')
            .populate('listener', 'name');

        if (!review) {
            return next(createError(`Review not found with id of ${req.params.id}`, 404));
        }

        res.status(200).json({
            success: true,
            data: review
        });
    } catch (err) {
        next(err);
    }
};
