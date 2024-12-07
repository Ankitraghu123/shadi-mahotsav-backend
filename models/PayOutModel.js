const mongoose = require('mongoose');

const PayOutSchema = new mongoose.Schema(
  {
    franchiseId:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"Franchise"
    },
   amount:Number,
   status:{
    type:Boolean,
    deafult:false
   },
  },
  { timestamps: true }
);

const PayOutModel = mongoose.model('PayOut', PayOutSchema);

module.exports = PayOutModel;
