import mongoose from 'mongoose';
import shortid from 'shortid';
import adminUserTypes from '../constants/adminUserTypes';

const Schema = mongoose.Schema;

const AdminUsersSchema = new Schema({
  id: {
    type: String,
    default: shortid.generate,
  },
  username: {
    type: String,
    minlength: 6,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    minlength: 6,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    enum: adminUserTypes,
    default: 'user',
    required: true,
  },
  active: {
    type: Boolean,
    default: false,
  }
}, { timestamps: {}});

const AdminUsers = mongoose.model('AdminUsers', AdminUsersSchema );
module.exports = AdminUsers;
