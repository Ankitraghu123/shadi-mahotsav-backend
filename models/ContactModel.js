const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema(
  {
    name: {
      type:String,
    },
   email:{
    type:String
   },
   number:{
    type:Number
   },
   message:{
    type:String
   },
    timestamp: {
      type: Date,
      default: Date.now,
    }
  },
  { timestamps: true }
);

const ContactModel = mongoose.model('Contact', ContactSchema);

module.exports = ContactModel;
