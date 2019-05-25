import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const ActivationLinksSchema = new Schema({
    userId: {
      type: String,
      required: true,
    },
    hex: {
      type: String,
      required: true,
    }
}, { timestamps: {}});

const ActivationLinks = mongoose.model('ActivationLinks', ActivationLinksSchema );
module.exports = ActivationLinks;
