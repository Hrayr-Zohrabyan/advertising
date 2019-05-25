import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const AdminRolesSchema = new Schema({
    role: {
      type: String,
      required: true,
    },
    permissions: {
      type: [String],
      default: [],
    }
}, { timestamps: {}});

const AdminRoles = mongoose.model('AdminRoles', AdminRolesSchema );
module.exports = AdminRoles;
