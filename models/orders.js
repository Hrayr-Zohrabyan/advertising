import mongoose from 'mongoose';
import shortid from 'shortid';
import orderStatuses from '../constants/orderStatuses';

const Schema = mongoose.Schema;

const OrdersSchema = new Schema({
    id: {
      type: String,
      default: shortid.generate,
    },
    projectId: {
      type: String,
      required: true,
    },
    supplierId: {
      type: String,
    },
    consumerId: {
      type: String,
    },
    orderDate: {
      type: Date,
      required: true,
    },
    orderPersons: {
      type: Number,
      required: true,
      default: 1,
    },
    listingDetails: {},
    status: {
      type: String,
      default: 'pending',
      enum: orderStatuses,
    },
    ratingConsumer: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingSupplier: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewConsumer: {
      type: String,
    },
    reviewSupplier: {
      type: String,
    },
    price: {
      type: Number,
    },
    deposit: {
      type: Number,
      default: 0,
    },
    priceComponents: {
      raw: {
        type: Number,
      },
      commission: {
        type: Number,
      },
      fixed: {
        type: Number,
      },
      features: {
        type: Number,
      },
      final: {
        type: Number,
      },
    },
    otherOptions: {},
}, { timestamps: {}});
OrdersSchema.index({ "id": 1, "project": 1}, { "unique": true });

const Orders = mongoose.model('Orders', OrdersSchema );
module.exports = Orders;
