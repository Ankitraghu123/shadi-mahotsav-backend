const mongoose = require('mongoose')
const bcrypt =require('bcrypt')

const FranchiseSchema = new mongoose.Schema({
    name: {
        type: String,
      },
    refBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Franchise'
    },
    refTo:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Franchise'
    }],
    sublineOf:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Franchise'
    }],
    sublines:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Franchise'
    }]
  }, {
    timestamps: true
  });

 


const FranchiseModel = mongoose.model('Franchise', FranchiseSchema);

module.exports = FranchiseModel;