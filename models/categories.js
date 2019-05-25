import mongoose from 'mongoose';
import shortid from 'shortid';

const Schema = mongoose.Schema;

const CategoriesSchema = new Schema({
  id: {
    type: String,
    default: shortid.generate,
  },
  projectId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  photo: {
    type: String,
    required: true,
  },
  categoryOptions: [{
    properties: {},
    id: {
      type: String,
      default: shortid.generate,
    },
  }],
  main: {
    type: Boolean,
    default: false,
    required: true,
  },
  active: {
    type: Boolean,
    default: true
  },
}, { timestamps: {}});
CategoriesSchema.index({ 'id': 1, 'projectId': 1}, { 'unique': true });

const Categories = mongoose.model('Categories', CategoriesSchema );
module.exports = Categories;
