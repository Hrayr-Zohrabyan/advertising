import mongoose from 'mongoose';
import shortid from 'shortid';
import recurringCycles from '../constants/recurringCycles';

const Schema = mongoose.Schema;

const ListingsSchema = new Schema({
  id: {
    type: String,
    default: shortid.generate,
  },
  projectId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  photo: {
    type: String,
  },
  tags: [{
    name: {
      type: String,
      required: true,
    },
    id: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      default: ''
    }
  }],
  price: {
    type: Number,
    required: true,
  },
  listingDate: {
    type: Date
  },
  isRecurring: {
    type: Boolean,
  },
  recurringCycle: {
    type: String,
    enum: recurringCycles,
  },
  active: {
    type: Boolean,
    default: true,
  },
  otherOptions: {},
}, { timestamps: {}});
ListingsSchema.index({ "id": 1, "projectId": 1}, { "unique": true });

const Listings = mongoose.model('Listings', ListingsSchema );
module.exports = Listings;
