const mongoose = require('mongoose');

const PayOutSchema = new mongoose.Schema(
  {
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
