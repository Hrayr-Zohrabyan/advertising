import mongoose from 'mongoose';
import shortid from 'shortid';

const Schema = mongoose.Schema;

const ChatsSchema = new Schema({
  id: {
    type: String,
    default: shortid.generate,
  },
  projectId: {
    type: String,
    required: true,
  },
  user1: {
    type: String,
    required: true,
  },
  user2: {
    type: String,
    required: true,
  },
  messages: [
    {
      id: {
        type: String,
        default: shortid.generate,
      },
      body: {
        type: String,
        required: true,
      },
      seen: {
        type: Boolean,
        default: false,
      },
      userId: {
        type: String,
        required: true,
      }
    }
  ]
}, { timestamps: {}});

const Chats = mongoose.model('Chats', ChatsSchema );
module.exports = Chats;
