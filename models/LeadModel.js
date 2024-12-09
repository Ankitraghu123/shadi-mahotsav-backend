const mongoose = require('mongoose')

const LeadSchema = new mongoose.Schema({
    name: {
        type: String
      },
     email:{
        type:String,
        unique:true
     },
     mobileNumber:{
        type:Number
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
      gender:{
        type:String
      },
      refBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Franchise"
      }
  }, {
    timestamps: true
  });


const LeadModel = mongoose.model('Lead', LeadSchema);

module.exports = LeadModel;