import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const UserRoleSchema = new Schema({
    projectId: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    permissions: {
      type: [String],
      default: [],
    }
}, { timestamps: {}});

const UserRole = mongoose.model('UserRole', UserRoleSchema );
module.exports = UserRole;
