const mongoose = require('mongoose')
const bcrypt =require('bcrypt')

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'], 
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'], 
      },
      email: {
        type: String,
        // required: [true, 'Email is required'], 
        trim: true,
        unique: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            "Please enter a valid email address"
        ],
      },
      mobileNumber:{
        type:Number,
      },
      gender:{
        type:String,
        // required:false,
        // enum:['male','female','other','']
      },
      religion:{
        type:String,
        // enum:['Christianity','Hindu','Islam','Sikh','Nonreligious']
      },
      country:{
        type:String,
        default:'India'
      },
      state:{
        type:String,
      },
      city:{
        type:String
      },
      education:{
        type:String,
        // enum: ['High School','Associates','Technical School', 'Bachelor\'s', 'Master\'s', 'MBBS','LLB','JD','MD','PhD', 'Other']
      },
      about:{
        type:String,
      },
      gallery: [
        {
          url: {
            type: String,
            required: true, // Ensure the URL is always present
          },
          fileId: {
            type: String,
            required: true, // Ensure the fileId is always present
          },
        },
      ],
      password:{
        type: String,
        minlength: [6, "Password must be at least 6 characters long"],
      },
      role:{
        type:String,
        default:"user"
      },
      dob:{
        type:Date,
      },
      couponCode:{
        type:String
      },
      profilePicture:{
        type:String,
        default:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAM1BMVEXk5ueutLeqsbTn6eqpr7PJzc/j5ebf4eLZ3N2wtrnBxsjN0NLGysy6v8HT1tissra8wMNxTKO9AAAFDklEQVR4nO2d3XqDIAxAlfivoO//tEOZWzvbVTEpic252W3PF0gAIcsyRVEURVEURVEURVEURVEURVEURVEURVEURVEURflgAFL/AirAqzXO9R7XNBVcy9TbuMHmxjN6lr92cNVVLKEurVfK/zCORVvW8iUBnC02dj+Wpu0z0Y6QlaN5phcwZqjkOkK5HZyPAjkIjSO4fIdfcOwFKkJlX4zPu7Ha1tIcwR3wWxyFhRG6g4Je0YpSPDJCV8a2Sv2zd1O1x/2WMDZCwljH+clRrHfWCLGK8REMiql//2si5+DKWKcWeAGcFMzzNrXC/0TUwQ2s6+LhlcwjTMlYsUIQzPOCb7YBiyHopyLXIEKPEkI/TgeuiidK/R9FniUDOjRDpvm0RhqjMyyXNjDhCfIMYl1gGjIMIuYsnGEYRMRZOMMunaLVwpWRW008v6fYKDIzxCwVAeNSO90BJW6emelYBRF/kHpYGVaoxTDAaxOFsfP9y8hpJ4xd7gOcij7JNGQ1EYFgkPJa1jQEiYZXRaRINKxSDUW9n+FT82lSKadkiru9/4XPqSLWOekGPoY05TAvLm9orm+YWuwHoBHkZKijNBJGmeb61eL6Ff/6q7bLr7yvv3vKGhpDRjvgjGaPz+gUg6YgcvpyAR2FIZ9U6nEEyZRTovmEU32KichpGn7C17XrfyH9gK/c0CMP05HZIM2uf9sEveizKveBy9/6Qt7o89ne33D525cfcIMW6ab+TMEukQbQbu+xu7X3A9bChmWaCeAkG17bpntwXgWxHaMzGPmUaR5dQZiKqRVeUZ3047fi3nAu28h4CHxCsZAgmEH8Y27jJAhm8c+5RQzRQNVGhVFSfxOYIjp/pP7RxzjevYXVGf4eLt+BJ1vCuLuLkrgABgCGXZ2wik5uty+oBvNirI6mkzhAf4Gsb58Hcm67Jzd+KwD10BYPLL3e0MjvKrgAULnOfveF/O4N2Xb9BZom3gJes3F9X5Zze8/6Yt09b4CrqsEjUv8oFBaR2rl+6CZr2xVrp24o/WitBKuGrrpl1+bFkmK2qXTON4VpbdfLa7o7y/WdLxG7lm2Lqh2clOwTegbvc/vj2U78CwhA87Bn8G5Nk3eOb0Nsr9flz3sG78UUtue4kpv1xvjg3TMay62BMlTlP+vrOMnJsRmt/ze0jsfkPPYdAH57hK+34PeOyc8XIXu5xT2HsUkdZz+adwg8HGFfQ3K5jtDvbUiO4Di9/ywHGrL88pDizZ++oTp+an+SMX/ndymUCwmHMdO7yuOx83pUx/eEMU0AvxWndwgidAqOZ8ypCwdEfvvEo6D9HwpA8wzvmOJEqAg9ySu8g4x0Hb9hSB/BANEKJ+LbPBU0lzbAJs4xt1AoshKkUGQmiH8/jJ0gdhTTLmSegHlPE0oOdXALnqDjKYh3px//fSgSWG8UqfrrIICzYYSJXRr9BSPbpNzw7gBjKjKOYI7ReIGqQRIap5+5MdjyvuDkExvGeXSlONWZAP3/AZBwJohU7QJRGU+cTVH18ELmRPNBmibW6MT/k1b0XhdkRBvyT6SB6EYv/GvhSmRNpGngRULsAlxMCGNXp7w3FfdEbTEEDdLI9TdIKRUzUesa3I461ER8cpNT7gMRhpKmYVS9ELOgCUQsa4SsulciKiLbY+AnHD8cpuhISsnxpamI84sbDq9qYJgf8wiiOBrC7Ml7M7ZECCqKoiiKoiiKoiiKoijv5AvJxlZRyNWWLwAAAABJRU5ErkJggg=='
      },
      profilePictureFileId:{
        type:String,
        
      },
      height:{
        type:Number
      },
      weight:{
        type:Number
      },
      fatherName:{
        type:String
      },
      mothername:{
        type:String
      },
      address:{
        type:String
      },
      jobType:{
        type:String,
      },
      companyName:{
        type:String
      },
      salary:{
        type:String,
      },
      totalExperience:{
        type:String,
      },
      degree:{
        type:String
      },
      school:{
        type:String
      },
      college:{
        type:String
      },
      zodiacSign:{
        type:String
      },
      requestSended:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
      }],
      requestReceived:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
      }],
      connections:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
      }],
      maritalStatus:{
        type:String
      },
      plans: [
        {
          plan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Plan',
          },
          purchaseDate: {
            type: Date,
          },
          expiryDate: {
            type: Date,
          },
        },
      ],
  }, {
    timestamps: true
  });

  UserSchema.pre('save', async function (next) {
    if (!this.isModified("password")) {
        next();
    }
    const salt = bcrypt.genSaltSync(10);
    this.password = await bcrypt.hash(this.password, salt);
  });
  
  UserSchema.methods.isPasswordMatched = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;