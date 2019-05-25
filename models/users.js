import mongoose from 'mongoose';
import shortid from 'shortid';
import userTypes from '../constants/userTypes';

const Schema = mongoose.Schema;

const UsersSchema = new Schema({
    id: {
      type: String,
      default: shortid.generate,
    },
    projectId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      minlength: 6,
      required: true,
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
    active: {
      type: Boolean,
      default: false,
    },
    manualActive: {
      type: Boolean,
      default: true
    },
    userType: {
      type: String,
      enum: userTypes,
      default: 'consumer',
      required: true,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    ratingSum: {
      type: Number,
      default: 0,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    availability: {
      monday: {
        active: {
          type: Boolean,
          default: false,
        },
        hours: {
          start: {
            type: String
          },
          end: {
            type: String
          }
        }
      },
      tuesday: {
        active: {
          type: Boolean,
          default: false,
        },
        hours: {
          start: {
            type: String
          },
          end: {
            type: String
          }
        }
      },
      wednesday: {
        active: {
          type: Boolean,
          default: false,
        },
        hours: {
          start: {
            type: String
          },
          end: {
            type: String
          }
        }
      },
      thursday: {
        active: {
          type: Boolean,
          default: false,
        },
        hours: {
          start: {
            type: String
          },
          end: {
            type: String
          }
        }
      },
      friday: {
        active: {
          type: Boolean,
          default: false,
        },
        hours: {
          start: {
            type: String
          },
          end: {
            type: String
          }
        }
      },
      saturday: {
        active: {
          type: Boolean,
          default: false,
        },
        hours: {
          start: {
            type: String
          },
          end: {
            type: String
          }
        }
      },
      sunday: {
        active: {
          type: Boolean,
          default: false,
        },
        hours: {
          start: {
            type: String
          },
          end: {
            type: String
          }
        }
      },
      exclusions: {
        type: Array,
        default: []
      },
      orders: {
        type: Array,
        default: []
      },
    },
    address: {
      type: String
    },
    lat: {
      type: Number
    },
    lon: {
      type: Number
    },
    phone: {
      type: String,
    },
    otherProperties: {},
}, { timestamps: {}});
UsersSchema.index({ "username": 1, "projectId": 1}, { "unique": true });

const Users = mongoose.model('Users', UsersSchema );
module.exports = Users;
