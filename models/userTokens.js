import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const UserTokensSchema = new Schema({
    projectId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
    }
}, { timestamps: {}});
UserTokensSchema.index({ "userId": 1, "project": 1}, { "unique": true });

const UserTokens = mongoose.model('UserTokens', UserTokensSchema );
module.exports = UserTokens;
