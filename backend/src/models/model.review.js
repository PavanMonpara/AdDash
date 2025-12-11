import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const reviewSchema = new Schema({
    reviewer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    listener: {
        type: Schema.Types.ObjectId,
        ref: 'Listener',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

export default model('Review', reviewSchema);