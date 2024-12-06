const mongoose = require('mongoose')
const bcrypt =require('bcrypt')


const AdminSchema = new mongoose.Schema({
    name: {
        type: String
      },
     email:{
        type:String,
        unique:true
     },
     password:{
        type:String
     },
     mobileNumber:{
        type:Number
     }
  }, {
    timestamps: true
  });

  AdminSchema.pre('save', async function (next) {
    if (!this.isModified("password")) {
        next();
    }
    const salt = bcrypt.genSaltSync(10);
    this.password = await bcrypt.hash(this.password, salt);
  });
  
  AdminSchema.methods.isPasswordMatched = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };


const AdminModel = mongoose.model('Admin', AdminSchema);

module.exports = AdminModel;