import mongoose from 'mongoose';
import shortid from 'shortid';

const Schema = mongoose.Schema;

const ProjectsSchema = new Schema({
    id: {
      type: String,
      default: shortid.generate,
      unique: true,
    },
    userId: {
      type: String,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      default: 'no-reply@sky.am'
    },
    active: {
      type: String,
    },
    projectOptions: {
      smtpCredentials: {
        host: String,
        port: Number,
        auth: {
          user: String,
          pass: String
        }
      },
      logo: {
        type: String
      },
      emailSignature: {
        type: String,
        default: "With kindest regards"
      },
      registrationType: {
        type: String,
        enum: ['email', 'phone'],
        default: 'email',
      },
      consumerCanBecomeSupplier: {
        type: Boolean,
        default: false,
      },
      listingHasQuantity: {
        type: Boolean,
        default: true,
      },
      orderCanHaveMultipleListings: {
        type: Boolean,
        default: true,
      },
      orderActivationRequiresDeposit: {
        type: Boolean,
        default: false,
      },
      orderActivationDepositPercentage: {
        type: Number,
        default: 0,
      },
      supplierManualActivation: {
        type: Boolean,
        default: false
      },
      supplierHasAvailability: {
        type: Boolean,
        default: true
      },
      multipleOrdersAtTheSameTime: {
        type: Boolean,
        default: false
      },
      orderTakesHoursBefore: {
        type: Number,
        default: 1
      },
      orderTakesHoursAfter: {
        type: Number,
        default: 2
      },
      pastListingDateAcceptable: {
        type: Boolean,
        default: true
      },
      priceComponents: {
        commission: {
          type: Number,
          default: 0,
        },
        fixed: {
          type: Number,
          default: 0,
        },
        oneTime: {
          type: Number,
          default: 0,
        }
      },
      firebaseConfig: {
        url: String,
        certificate: {},
      },
    },
}, { timestamps: {}});

const Projects = mongoose.model('Projects', ProjectsSchema);
module.exports = Projects;
