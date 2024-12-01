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
      profilePicture:{
        type:String,
        default:'https://www.shutterstock.com/image-vector/user-profile-icon-vector-avatar-600nw-2247726673.jpg'
      },
      profilePictureFileId:{
        type:String,
        
      },
      package:{
        type:String,
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