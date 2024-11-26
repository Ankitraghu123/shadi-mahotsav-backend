const mongoose = require('mongoose')
const bcrypt =require('bcrypt')

const FranchiseSchema = new mongoose.Schema({
    name: {
        type: String,
      },
      mobileNumber: {
        type: Number,
      },
      state:{
        type:String,
      },
      city:{
        type:String,
      },
      code :{
        type:String
      },
    refBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Franchise'
    },
    refTo:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Franchise'
    }],
    uplineOf:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Franchise'
    },
    uplines:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Franchise'
    }],
    kycId: { type: mongoose.Schema.Types.ObjectId, 
    ref: 'KYC'
   }
  }, {
    timestamps: true
  });

 


const FranchiseModel = mongoose.model('Franchise', FranchiseSchema);

module.exports = FranchiseModel;