import mongoose from 'mongoose';
import shortid from 'shortid';

const Schema = mongoose.Schema;

const MediaSchema = new Schema({
    id: {
      type: String,
      default: shortid.generate,
      unique: true,
    },
    path: {
      type: String,
    }
}, { timestamps: {}});


const Media = mongoose.model('Media', MediaSchema );
module.exports = Media;
