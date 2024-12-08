const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
  aadharCardNumber: { type: String,},
  aadharCardFront: { type: String },
  aadharCardBack: { type: String },
  aadharCardApproved: { type:String,default:"Pending" },
  aadharCardReject:{type:String},

  panCardNumber: { type: String,  },
  panCardFront: { type: String },
  panCardBack: { type: String },
  panCardApproved: { type:String,default:"Pending"}, 
  panCardReject:{type:String},

  bankName: { type: String },
  accountType: { type: String, enum: ['Savings', 'Current'] },
  accountHolderName: { type: String },
  accountNumber: { type: String },
  reenterAccountNumber: { type: String },
  ifscCode: { type: String },
  accountPassbookPhoto: { type: String },
  accountPassbookApproved: { type:String,default:"Pending" }, 
  // Reject:{type:String},

  dob: { type: Date },
  gender: { type: String},
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  maritalStatus: { type: String },
  approved:{
    type:String,
    default:"Pending"
  },
  rejectReason:{
    type:String
  },
  nominee: {
    aadharCardFront: { type: String },
    aadharCardBack: { type: String },
    nomineeName: { type: String },
    nomineeRelationship: { type: String },
    nomineeDob: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('KYC', kycSchema);
