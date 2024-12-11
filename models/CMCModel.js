const mongoose = require('mongoose');

const CMCSchema = new mongoose.Schema(
  {
    franchiseId: {
      type:mongoose.Schema.Types.ObjectId,
      ref:'Franchise'
    },
    totalEarnings:{
      type:Number,
      default:0
    }
  
  },
  { timestamps: true }
);

const CMCModel = mongoose.model('CMC', CMCSchema);

module.exports = CMCModel;
