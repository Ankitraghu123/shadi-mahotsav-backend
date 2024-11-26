const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
  aadharCardNumber: { type: String, unique: true },
  aadharCardFront: { type: String },
  aadharCardBack: { type: String },
  aadharCardApproved: { type: Boolean, default: false },

  panCardNumber: { type: String, unique: true },
  panCardFront: { type: String },
  panCardBack: { type: String },
  panCardApproved: { type: Boolean, default: false }, 

  bankName: { type: String },
  accountType: { type: String, enum: ['Savings', 'Current'] },
  accountHolderName: { type: String },
  accountNumber: { type: String },
  reenterAccountNumber: { type: String },
  ifscCode: { type: String },
  accountPassbookPhoto: { type: String },

  dob: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  email: { type: String, unique: true },
  phone: { type: String },
  address: { type: String },
  maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'] },

  nominee: {
    aadharCardFront: { type: String },
    aadharCardBack: { type: String },
    nomineeName: { type: String },
    nomineeRelationship: { type: String },
    nomineeDob: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('KYC', kycSchema);
