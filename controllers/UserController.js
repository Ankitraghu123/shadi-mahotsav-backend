const { generateToken } = require('../config/jwtToken')
const asyncHandler = require('express-async-handler')
const {generateRefreshToken} = require('../config/refreshToken')
const UserModel = require('../models/UserModel')
const imagekit = require('../config/imageKit');
const ChatModel = require('../models/ChatModel');


const Register = asyncHandler(async (req, res) => {
   try {
     const existingUser = await UserModel.findOne({ email: req.body.email });
     if (existingUser) {
       return res.status(400).json({ message: 'Email is already registered' });
     }
 
     const newUser = await UserModel.create(req.body);
 
     const token = generateToken(newUser._id);
 
     res.status(201).json({ user: newUser, token });
   } catch (error) {
     res.status(500).json({ message: 'Registration failed', error: error.message });
   }
});


const Login = asyncHandler(async (req, res) => {
   const { email, password } = req.body;
 
   try {
     const user = await UserModel.findOne({ email });
     if (!user) {
       return res.status(404).json({ message: 'User not found' });
     }
 
     const isMatch = await user.isPasswordMatched(password);
     if (!isMatch) {
       return res.status(401).json({ message: 'Invalid credentials' });
     }
 
     const token = generateRefreshToken(user._id);
 
     res.status(200).json({ user, token });
   } catch (error) {
     res.status(500).json({ message: 'Login failed', error: error.message });
   }
 });


 const DeleteMember = asyncHandler(async (req, res) => {
  try {
    const {id} = req.params
    const deletedUser = await UserModel.findByIdAndDelete(id);

    res.status(201).json({ deletedUser });
  } catch (error) {
    res.status(500).json({ message: 'memeber deletion failed', error: error.message });
  }
});

 const EditProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const {formData} = req.body;

    console.log(formData)

    const updatedUser = await UserModel.findByIdAndUpdate(userId,formData)

   
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Profile updated successfully", data: updatedUser });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
};

 const uploadProfilePicture = asyncHandler(async (req, res) => {
   const { image, userId } = req.body;

   if (!image || !userId) {
       return res.status(400).json({ message: 'Image and userId are required' });
   }

   try {
       const response = await imagekit.upload({
           file: image, 
           fileName: `profile_${userId}`, 
           folder: "/profile_pictures" 
       });

       const user = await UserModel.findById(userId)
       user.profilePicture = response.url
       user.profilePictureFileId = response.fileId

       await user.save()

       res.status(200).json({
           message: 'Profile picture uploaded successfully',
           imageUrl: response.url,
           fileId: response.fileId
       });
   } catch (error) {
       res.status(500).json({ message: 'Image upload failed', error: error.message });
   }
});

const editProfilePicture = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const newImage = req.files?.newImage;

  if (!newImage || !userId) {
      return res.status(400).json({ message: 'New image and userId are required' });
  }

  try {
      const user = await UserModel.findById(userId);
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      if (user.profilePictureFileId) {
          await imagekit.deleteFile(user.profilePictureFileId)
              .catch((err) => {
                  console.error('Failed to delete old profile picture:', err.message);
              });
      }

      const uploadResponse = await imagekit.upload({
          file: newImage.data,
          fileName: `profile_${userId}`,
          folder: "/profile_pictures"
      });

      await UserModel.findByIdAndUpdate(userId, {
          profilePicture: uploadResponse.url,
          profilePictureFileId: uploadResponse.fileId
      }, { new: true, runValidators: false });

      res.status(200).json({
          message: 'Profile picture updated successfully',
          imageUrl: uploadResponse.url,
          fileId: uploadResponse.fileId
      });
  } catch (error) {
      res.status(500).json({ message: 'Failed to update profile picture', error: error.message });
  }
});


const deleteProfilePicture = asyncHandler(async (req, res) => {
   const { userId } = req.params

   if (!userId) {
       return res.status(400).json({ message: 'User ID is required' });
   }

   try {
       // Find the user by ID
       const user = await UserModel.findById(userId);
       if (!user) {
           return res.status(404).json({ message: 'User not found' });
       }

       // Check if the user has an existing profile picture to delete
       if (user.profilePictureFileId) {
           // Delete the profile picture from ImageKit
           await imagekit.deleteFile(user.profilePictureFileId)
               .catch((err) => {
                   console.error('Failed to delete profile picture:', err.message);
                   return res.status(500).json({ message: 'Failed to delete profile picture', error: err.message });
               });

           // Remove the profile picture URL and file ID from the user document
           user.profilePicture = null;
           user.profilePictureFileId = null;
           await user.save();

           return res.status(200).json({ message: 'Profile picture deleted successfully' });
       } else {
           return res.status(400).json({ message: 'No profile picture to delete' });
       }
   } catch (error) {
       res.status(500).json({ message: 'Failed to delete profile picture', error: error.message });
   }
});



 const GetSingleUser = asyncHandler(async (req, res) => {
   const { id} = req.params;
 
   try {
    const userData = await UserModel.findById(id).populate({
      path: 'plans.plan', 
      model: 'Plan', 
   });
 
     res.status(200).json(userData);
   } catch (error) {
     res.status(500).json({ message: 'user failed to fetch', error: error.message });
   }
 });

 const GetAllUser = asyncHandler(async (req, res) => { 
   try {
      const allUsers = await UserModel.find()
 
     res.status(200).json(allUsers);
   } catch (error) {
     res.status(500).json({ message: 'user failed to fetch', error: error.message });
   }
 });

 const SendRequest = asyncHandler(async (req, res) => {
   const { senderId, receiverId } = req.body;
 
   try {
     const sender = await UserModel.findById(senderId);
     const receiver = await UserModel.findById(receiverId);
 
     if (!sender || !receiver) {
       return res.status(404).json({ message: 'Sender or receiver not found' });
     }
 
     if (!sender.requestSended.includes(receiverId)) {
       sender.requestSended.push(receiverId);
     }
     if (!receiver.requestReceived.includes(senderId)) {
       receiver.requestReceived.push(senderId);
     }
 
     await sender.save();
     await receiver.save();
 
     res.status(200).json({ message: 'Request sent successfully', sender, receiver });
   } catch (error) {
     res.status(500).json({ message: 'Request send failed', error: error.message });
   }
 });

 const RejectRequest = asyncHandler(async (req, res) => {
   const { senderId, receiverId } = req.body;
 
   try {
     const sender = await UserModel.findById(senderId);
     const receiver = await UserModel.findById(receiverId);
 
     if (!sender || !receiver) {
       return res.status(404).json({ message: 'Sender or receiver not found' });
     }
 
     sender.requestSended = sender.requestSended.filter(id => id.toString() !== receiverId);
 
     receiver.requestReceived = receiver.requestReceived.filter(id => id.toString() !== senderId);

     sender.connections = sender.connections.filter(id => id.toString() !== receiverId);
     receiver.connections = receiver.connections.filter(id => id.toString() !== senderId);
     await sender.save();
     await receiver.save();
 
     res.status(200).json({ message: 'Request rejected successfully', sender, receiver });
   } catch (error) {
     res.status(500).json({ message: 'Request rejection failed', error: error.message });
   }
 });

 const AcceptRequest = asyncHandler(async (req, res) => {
   const { senderId, receiverId } = req.body;
 
   try {
     const sender = await UserModel.findById(senderId);
     const receiver = await UserModel.findById(receiverId);
 
     if (!sender || !receiver) {
       return res.status(404).json({ message: 'Sender or receiver not found' });
     }
 
     if (!receiver.requestReceived.includes(senderId) || !sender.requestSended.includes(receiverId)) {
       return res.status(400).json({ message: 'Request not found' });
     }
 
     receiver.requestReceived = receiver.requestReceived.filter(id => id.toString() !== senderId);
     receiver.connections.push(senderId);
 
     sender.requestSended = sender.requestSended.filter(id => id.toString() !== receiverId);
     sender.connections.push(receiverId);
 
     await sender.save();
     await receiver.save();
 
     res.status(200).json({ message: 'Request accepted successfully', sender, receiver });
   } catch (error) {
     res.status(500).json({ message: 'Request acceptance failed', error: error.message });
   }
 });
 
 const AllReceivedRequest = asyncHandler(async (req, res) => {
   const { id } = req.params;
 
   try {
     const user = await UserModel.findById(id).populate('requestReceived');
 
     if (!user) {
       return res.status(404).json({ message: 'User not found' });
     }
 
     res.status(200).json({
       message: 'Fetched received requests successfully',
       receivedRequests: user.requestReceived,
     });
   } catch (error) {
     res.status(500).json({ message: 'Failed to fetch received requests', error: error.message });
   }
 });

 const AllSendedRequest = asyncHandler(async (req, res) => {
   const { id } = req.params;
 
   try {
     const user = await UserModel.findById(id).populate('requestSended');
 
     if (!user) {
       return res.status(404).json({ message: 'User not found' });
     }
 
     res.status(200).json({
       message: 'Fetched sended requests successfully',
       sendedRequests: user.requestSended,
     });
   } catch (error) {
     res.status(500).json({ message: 'Failed to fetch sended requests', error: error.message });
   }
 });
 
 const AllConnections = asyncHandler(async (req, res) => {
   const { id } = req.params;
 
   try {
     const user = await UserModel.findById(id).populate('connections');
 
     if (!user) {
       return res.status(404).json({ message: 'User not found' });
     }
 
     res.status(200).json({
       message: 'Fetched connections successfully',
       connections: user.connections,
     });
   } catch (error) {
     res.status(500).json({ message: 'Failed to fetch connections requests', error: error.message });
   }
 });

 const CompareProfile = asyncHandler(async (req, res) => {
   const { userOneId, userTwoId } = req.body;
 
   try {
     const userOne = await UserModel.findById(userOneId);
     const userTwo = await UserModel.findById(userTwoId);
 
     if (!userOne || !userTwo) {
       return res.status(404).json({ message: 'One or both users not found' });
     }
 
     let matchScore = 0;
 
     // Check religion
     if (userOne.religion === userTwo.religion) {
       matchScore += 20;
     }
 
     // Check country
     if (userOne.country === userTwo.country) {
       matchScore += 20;
     }
 
     // Check city
     if (userOne.city === userTwo.city) {
       matchScore += 20;
     }
 
     // Check education
     if (userOne.education === userTwo.education) {
       matchScore += 20;
     }
 
     // Check age similarity within a 5-year range
     const calculateAge = (dob) => {
       const diff = new Date() - new Date(dob);
       return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
     };
 
     const ageOne = calculateAge(userOne.dob);
     const ageTwo = calculateAge(userTwo.dob);
 
     if (Math.abs(ageOne - ageTwo) <= 5) {
       matchScore += 20;
     }
 
     // Calculate percentage
     const matchPercentage = matchScore; // as each field adds 20% to the score
 
     res.status(200).json({
       message: 'Profile matched successfully',
       matchPercentage: `${matchPercentage}%`,
       details: {
         religion: userOne.religion === userTwo.religion,
         country: userOne.country === userTwo.country,
         city: userOne.city === userTwo.city,
         education: userOne.education === userTwo.education,
         ageDifference: Math.abs(ageOne - ageTwo),
       },
     });
   } catch (error) {
     res.status(500).json({ message: 'Failed to match profiles', error: error.message });
   }
 });

 const FindMatchingProfiles = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    const targetUser = await UserModel.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const allUsers = await UserModel.find({ _id: { $ne: userId } });
    const matchingUsers = [];

    const calculateAge = (dob) => {
      const diff = new Date() - new Date(dob);
      return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    };

    allUsers.forEach(user => {
      let matchScore = 0;

      // Check religion
      if (user.religion === targetUser.religion) {
        matchScore += 10;
      }

      // Check country
      if (user.country === targetUser.country) {
        matchScore += 10;
      }

      // Check state
      if (user.state === targetUser.state) {
        matchScore += 5;
      }

      // Check city
      if (user.city === targetUser.city) {
        matchScore += 10;
      }

      // Check education
      if (user.education === targetUser.education) {
        matchScore += 10;
      }

      // Check job type
      if (user.jobType === targetUser.jobType) {
        matchScore += 5;
      }

      // Check company name
      if (user.companyName === targetUser.companyName) {
        matchScore += 5;
      }

      // Check height similarity within a 5cm range
      if (Math.abs(user.height - targetUser.height) <= 5) {
        matchScore += 5;
      }

      // Check weight similarity within a 5kg range
      if (Math.abs(user.weight - targetUser.weight) <= 5) {
        matchScore += 5;
      }

      // Check age similarity within a 5-year range
      const targetUserAge = calculateAge(targetUser.dob);
      const userAge = calculateAge(user.dob);

      if (Math.abs(targetUserAge - userAge) <= 5) {
        matchScore += 10;
      }

      // Check zodiac sign
      if (user.zodiacSign === targetUser.zodiacSign) {
        matchScore += 10;
      }
      

      // Add user to matchingUsers array if match score is above 50%
      if (matchScore >= 50) {
        matchingUsers.push({
          user,
          matchPercentage: `${matchScore}%`,
        });
      }
    });

    res.status(200).json({
      message: 'Matching profiles retrieved successfully',
      matchingProfiles: matchingUsers,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to find matching profiles', error: error.message });
  }
});


const ProfileCompletion = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params; // Assuming userId is passed as a URL parameter
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const fields = [
      { name: 'name', label: 'Name' },
      { name: 'email', label: 'Email' },
      { name: 'profilePicture', label: 'Profile Picture' },
      { name: 'dob', label: 'Date of Birth' },
      { name: 'mobileNumber', label: 'Mobile Number' },
      { name: 'gender', label: 'Gender' },
      { name: 'religion', label: 'Religion' },
      { name: 'country', label: 'Country' },
      { name: 'city', label: 'City' },
      { name: 'education', label: 'Education' },
      { name: 'about', label: 'About' },
      { name: 'height', label: 'Height' },
      { name: 'weight', label: 'Weight' },
      { name: 'fatherName', label: 'Father\'s Name' },
      { name: 'motherName', label: 'Mother\'s Name' },
      { name: 'address', label: 'Address' },
      { name: 'jobType', label: 'Job Type' },
      { name: 'companyName', label: 'Company Name' },
      { name: 'salary', label: 'Salary' },
      { name: 'totalExperience', label: 'Total Experience' },
      { name: 'degree', label: 'Degree' },
      { name: 'school', label: 'School' },
      { name: 'college', label: 'College' },
      { name: 'zodiacSign', label: 'Zodiac Sign' }
    ];

    // Check if the fields are filled
    const fieldCompletionPercentages = fields.map(field => {
      const isFieldFilled = user[field.name] && user[field.name] !== '';
      return {
        field: field.label,
        isFilled: isFieldFilled
      };
    });

    const totalFields = fields.length;
    const filledFields = fieldCompletionPercentages.filter(field => field.isFilled).length;

    const completionPercentage = (filledFields / totalFields) * 100;

    const remainingFields = fieldCompletionPercentages.filter(field => !field.isFilled);

    if (remainingFields.length === 0) {
      return res.status(200).json({
        message: 'Profile is complete',
        completionPercentage: Math.round(completionPercentage),
        remainingFieldsWithPercentage: []
      });
    }

    // Calculate percentage for remaining fields
    const remainingFieldPercentage = (100 - completionPercentage) / remainingFields.length;

    const remainingFieldsWithPercentage = remainingFields.map(field => ({
      field: field.field,
      percentage: Math.round(remainingFieldPercentage)
    }));

    res.status(200).json({
      message: 'Profile completion data',
      completionPercentage: Math.round(completionPercentage),
      remainingFieldsWithPercentage
    });

  } catch (error) {
    res.status(500).json({ message: 'Failed to calculate profile completion percentage', error: error.message });
  }
});

const AddImageToGallery = asyncHandler(async (req, res) => {
  const { userId } = req.body; 

  if (!req.files || !userId) {
    return res.status(400).json({ message: 'No image uploaded or userId missing' });
  }

  const newImage = req.files.image;

  try {
    const uploadResponse = await imagekit.upload({
      file: newImage.data,
      fileName: `gallery_image_${userId}`,
      folder: '/gallery_images', // Optional: can be a sub-folder in ImageKit
    });

    // Find the user and add the image URL to their gallery
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add the new image to the gallery field (assuming it exists in the User model)
    if (!user.gallery) {
      user.gallery = [];  // Initialize gallery if it doesn't exist
    }

    user.gallery.push({
      url: uploadResponse.url,
      fileId: uploadResponse.fileId,
    });

    await user.save(); // Save the updated user object

    res.status(200).json({
      message: 'Image added to gallery successfully',
      imageUrl: uploadResponse.url,
      fileId: uploadResponse.fileId,
    });
  } catch (error) {
    console.error('Error uploading image to gallery:', error);
    res.status(500).json({ message: 'Failed to upload image to gallery', error: error.message });
  }
});

const EditImageInGallery = asyncHandler(async (req, res) => {
  const { userId, fileId } = req.body;

  if (!req.files || !userId || !fileId) {
    return res.status(400).json({ message: 'No image uploaded, userId, or fileId missing' });
  }

  const newImage = req.files.image;

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const imageIndex = user.gallery.findIndex((img) => img.fileId === fileId);
    if (imageIndex === -1) {
      return res.status(404).json({ message: 'Image not found in user gallery' });
    }

    // Delete the old image from ImageKit
    await imagekit.deleteFile(fileId);

    // Upload the new image
    const uploadResponse = await imagekit.upload({
      file: newImage.data,
      fileName: `gallery_image_${userId}`,
      folder: '/gallery_images',
    });

    // Update the gallery with the new image URL and fileId
    user.gallery[imageIndex] = {
      url: uploadResponse.url,
      fileId: uploadResponse.fileId,
    };

    await user.save();

    res.status(200).json({
      message: 'Image updated successfully',
      imageUrl: uploadResponse.url,
      fileId: uploadResponse.fileId,
    });
  } catch (error) {
    console.error('Error editing image in gallery:', error);
    res.status(500).json({ message: 'Failed to edit image in gallery', error: error.message });
  }
});

const DeleteImageFromGallery = asyncHandler(async (req, res) => {
  const { userId, fileId } = req.body;

  if (!userId || !fileId) {
    return res.status(400).json({ message: 'userId or fileId missing' });
  }

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const imageIndex = user.gallery.findIndex((img) => img.fileId === fileId);
    if (imageIndex === -1) {
      return res.status(404).json({ message: 'Image not found in user gallery' });
    }

    // Delete the image from ImageKit
    await imagekit.deleteFile(fileId);

    // Remove the image from the gallery array
    user.gallery.splice(imageIndex, 1);

    await user.save();

    res.status(200).json({ message: 'Image deleted from gallery successfully' });
  } catch (error) {
    console.error('Error deleting image from gallery:', error);
    res.status(500).json({ message: 'Failed to delete image from gallery', error: error.message });
  }
});

const getUsersChattedWith = async (req, res) => {
  try {
    const currentUserId = req.params.userId; 
    console.log(currentUserId)

    const chats = await ChatModel.find({
      $or: [
        { senderId: currentUserId },
        { receiverId: currentUserId }
      ]
    }).populate('senderId receiverId'); // Populate the senderId and receiverId fields to get the user details

    // Get unique users by collecting the senderId and receiverId
    const usersChattedWith = [];
    chats.forEach(chat => {
      if (chat.senderId._id.toString() !== currentUserId.toString()) {
        usersChattedWith.push(chat.senderId);
      }
      if (chat.receiverId._id.toString() !== currentUserId.toString()) {
        usersChattedWith.push(chat.receiverId);
      }
    });

    console.log(usersChattedWith)

    // Remove duplicate users from the list
    const uniqueUsers = [...new Map(usersChattedWith.map(user => [user._id.toString(), user])).values()];

    res.status(200).json({
      success: true,
      data: uniqueUsers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving users',
      error: error.message
    });
  }
};
 
module.exports = {Register,Login,SendRequest,RejectRequest,AcceptRequest,GetSingleUser,GetAllUser,AllReceivedRequest, AllSendedRequest,AllConnections,CompareProfile,FindMatchingProfiles,uploadProfilePicture,editProfilePicture,deleteProfilePicture,ProfileCompletion,EditProfile,AddImageToGallery,EditImageInGallery,DeleteImageFromGallery,getUsersChattedWith,DeleteMember}