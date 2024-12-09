const mongoose = require('mongoose')
const bcrypt =require('bcrypt')

const FranchiseSchema = new mongoose.Schema({
    name: {
        type: String,
      },
      password:{
        type:String,
      },
      email:{
        type:String,
        unique:true
      },
      mobileNumber: {
        type: Number,
      },
      country:{
        type:String,
      },
      state:{
        type:String,
      },
      city:{
        type:String,
      },
      pinCode:{
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
      upgradeMemberRef:[
        {
          type:mongoose.Schema.Types.ObjectId,
          ref:'User'
        }
      ],
      retailMemberRef:[
        {
          type:mongoose.Schema.Types.ObjectId,
          ref:'User'
        }
      ],
      couponWallet:{
        type:Number
      },
      retailWallet:{
        type:Number,
        default:0
      },
      upgradeWallet:{
        type:Number,
        default:0
      },
      wallet:{
        type:Number,
        default:0
      },
      couponOneMonth:{
        type:String
      },
      couponThreeMonth:{
        type:String
      },
      couponOneYear:{
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
   },
   totalEarning:{
    type:Number,
    default:0
   },
   payOutDetails:[
    {
      type:mongoose.Schema.Types.ObjectId,
      ref:'PayOut'
    }
   ],
   leads:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Lead"
   }]
  }, {
    timestamps: true
  });

 


const FranchiseModel = mongoose.model('Franchise', FranchiseSchema);

module.exports = FranchiseModel;