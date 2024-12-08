const mongoose = require('mongoose');

const PayOutSchema = new mongoose.Schema(
  {
    franchiseId:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"Franchise"
    },
    reqAmount:Number,
   amount:Number,
   status:{
    type:String,
    default:"Pending"
   },
   rejectReason:{
    type:String
   },
   panCardApproved:{
    type:Boolean,
    default:false
   }
  },
  { timestamps: true }
);

const PayOutModel = mongoose.model('PayOut', PayOutSchema);

module.exports = PayOutModel;
