const asyncHandler = require('express-async-handler')
const FranchiseModel = require('../models/FranchiseModel');
const imagekit = require('../config/imageKit');
const KycModel = require('../models/KycModel');
const jwt = require('jsonwebtoken');
// const { request } = require('express');
const PayOutModel = require('../models/PayOutModel');
const CFCModel = require('../models/CFCModel');
const GlobalCFCIncome = require('../models/GlobalCFCIncome');
const cron = require('node-cron');
const GlobalCMCIncome = require('../models/GlobalCMCIncome');
const CMCModel = require('../models/CMCModel');
const DailyReportModel = require('../models/DailyReportModel');
const AutoPoolModel = require('../models/AutoPoolModel');

const generateUniqueCoupon = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let coupon = '';
  for (let i = 0; i < 5; i++) { // Generate a 10-character unique code
      coupon += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return coupon;
};

const registerFranchise = asyncHandler(async (req, res) => {
    let { name,password, refBy, uplineId,mobileNumber,country,state,city,package,email } = req.body;

    refBy = refBy ? refBy.toLowerCase() : refBy;
    uplineId = uplineId ? uplineId.toLowerCase() : uplineId;


    try {
        // Automatically generate a sequential code if not provided
        let code;
        const lastFranchise = await FranchiseModel.findOne().sort({ createdAt: -1 });
        if (lastFranchise && lastFranchise.code) {
            const lastCodeNumber = parseInt(lastFranchise.code.slice(1)) || 0; // Extract numeric part
            code = `f${lastCodeNumber + 1}`; // Generate the next code
        } else {
            code = 'f1'; // Default to F1 if no franchise exists
        }

        let couponWallet = 0;
        if (package.toLowerCase() === 'silver') {
            couponWallet = 600;
        } else if (package.toLowerCase() === 'gold') {
            couponWallet = 5400;
        }

        // If no uplineId and refBy are provided, create the root franchise
        if (!uplineId && !refBy) {
            const rootFranchise = new FranchiseModel({
                name,
                code,
                refBy: null, // No referrer
                uplineOf: null, // No upline
                uplines: [], // No uplines
                mobileNumber,
                country,
                state,
                city,
                package,
                password,
                email,
                couponWallet,
                couponOneMonth: generateUniqueCoupon(),
                couponThreeMonth: generateUniqueCoupon(),
                couponOneYear: generateUniqueCoupon(),
            });

            const savedFranchise = await rootFranchise.save();
            await registerInAutoPool(savedFranchise);

            if(savedFranchise.package == 'gold'){
              const newCfc = await CFCModel.create({
                franchiseId : savedFranchise._id
              })
    
              await newCfc.save()
              await GlobalCFCIncome.updateOne({}, { $inc: { totalIncome: 108 } }, { upsert: true });
              await GlobalCMCIncome.updateOne({}, { $inc: { totalIncome: 108 } }, { upsert: true });
            }else if(savedFranchise.package =='silver'){
              //then add 12 ruppes in globalcfcincome
              await GlobalCFCIncome.updateOne({}, { $inc: { totalIncome: 12 } }, { upsert: true });
              await GlobalCMCIncome.updateOne({}, { $inc: { totalIncome: 12 } }, { upsert: true });
            }

            return res.status(201).json({
                message: 'Root franchise registered successfully.',
                franchise: savedFranchise,
            });
        }

        // 1. Validate uplineId and refBy by finding their IDs using the provided codes
        if(!uplineId){
            uplineId = refBy
        }
        const upline = await FranchiseModel.findOne({ code: uplineId });
        if (!upline) {
            return res.status(400).json({ message: 'Invalid upline code. Upline not found.' });
        }

        const referrer = await FranchiseModel.findOne({ code: refBy });
        if (!referrer) {
            return res.status(400).json({ message: 'Invalid referrer code. Referrer not found.' });
        }

        

        const isInTree = async (root, targetId) => {
            if (root._id.toString() === targetId) return true; // Found the target

            for (const childId of root.uplines) {
                const child = await FranchiseModel.findById(childId);
                if (child && (await isInTree(child, targetId))) {
                    return true; // Target found in the subtree
                }
            }

            return false; // Target not found in this subtree
        };

        const uplineInRefTree = await isInTree(referrer, upline._id.toString());
        if (!uplineInRefTree) {
            return res.status(400).json({
                message: 'The provided upline is not part of the referrer tree.',
            });
        }

        // 2. Find an available spot in the upline's downlines or their sub-tree
        let parent = upline;
        let availableParent = null;

        const findAvailableSlot = async (root) => {
            const queue = [root]; // Start with the root node (upline)
        
            while (queue.length > 0) {
                const current = queue.shift(); // Get the first node in the queue
        
                // Check if this node has an available slot
                if (current.uplines.length < 3) {
                    return current; // Return the first node with an available slot
                }
        
                // Add the current node's children to the queue for further processing
                for (const childId of current.uplines) {
                    const child = await FranchiseModel.findById(childId);
                    if (child) {
                        queue.push(child);
                    }
                }
            }
        
            return null; // No available slots found
        };

        

        availableParent = await findAvailableSlot(parent);

        if (!availableParent) {
            return res.status(400).json({ message: 'No available slots in the matrix for the provided upline.' });
        }

        // 3. Create the new franchise
        const newFranchise = new FranchiseModel({
            name,
            code,
            refBy: referrer._id,
            uplineOf: availableParent._id,
            // uplines: [...availableParent.uplines, availableParent._id], // Inherit upline chain
            mobileNumber,
            country,
            state,
            city,
            package,
            password,
            email,
            couponWallet,
            couponOneMonth: generateUniqueCoupon(),
            couponThreeMonth: generateUniqueCoupon(),
            couponOneYear: generateUniqueCoupon(),
        });

        // Save the new franchise
        const savedFranchise = await newFranchise.save();
        const auto = await registerInAutoPool(savedFranchise)
        console.log("auto pool",auto)

        if(savedFranchise.package == 'gold'){
          const newCfc = await CFCModel.create({
            franchiseId : savedFranchise._id
          })

          await newCfc.save()
          await GlobalCFCIncome.updateOne({}, { $inc: { totalIncome: 108 } }, { upsert: true });

          await GlobalCMCIncome.updateOne({}, { $inc: { totalIncome: 108 } }, { upsert: true });
        }else if(savedFranchise.package =='silver'){
          //then add 12 ruppes in globalcfcincome
          await GlobalCFCIncome.updateOne({}, { $inc: { totalIncome: 12 } }, { upsert: true });
          await GlobalCMCIncome.updateOne({}, { $inc: { totalIncome: 12 } }, { upsert: true });
        }

        // 4. Update the parent's downline reference
        availableParent.uplines.push(savedFranchise._id);
        referrer.refTo.push(savedFranchise?._id)
        await availableParent.save();

        if(referrer.refTo?.length >= 3 && referrer.package == "gold"){
          console.log(referrer.refTo?.length)
          referrer.wallet += referrer.upgradeWallet
          
          referrer.upgradeWallet = 0
        }
        await referrer.save()

        if(referrer.refTo?.length >= 100){
          const newCmc = await CMCModel.create({
            franchiseId : referrer._id
          })

          await newCmc.save()
        }

        let currentUplineId = savedFranchise.uplineOf; 
        let level = 1; 
        const distributionAmount = package == 'gold' ? 81 : 9; 
        
        while (currentUplineId && level <= 15) {
            const upline = await FranchiseModel.findById(currentUplineId);
            if (!upline) break; 
                
            upline.downlineIncome = upline.downlineIncome || []; 
            upline.downlineIncome.push({
                franchiseId: savedFranchise._id, 
                amount: distributionAmount,
                level: level, 
            });
        
            upline.totalDownlineIncome = (upline.totalDownlineIncome || 0) + distributionAmount;

            if(upline.package == "gold" && upline.refTo?.length >= 3){
              upline.wallet += distributionAmount
            }else{
              upline.upgradeWallet += (distributionAmount * 80)/100
              upline.wallet += (distributionAmount * 20)/100
            }

            if(upline.package == "silver" && upline.upgradeWallet >= 3304){
              upline.package = "gold"
              upline.upgradeWallet = upline.upgradeWallet - 3304
              if(upline.refTo?.length >=3 ){
                upline.wallet += upline.upgradeWallet
                upline.upgradeWallet = 0
              }
              upline.couponWallet += 5400
            const newCfc = await CFCModel.create({
              franchiseId : upline._id
            })
  
            await newCfc.save()
            await GlobalCFCIncome.updateOne({}, { $inc: { totalIncome: 108 } }, { upsert: true });
            await GlobalCMCIncome.updateOne({}, { $inc: { totalIncome: 108 } }, { upsert: true });
            }
        
            await upline.save();
        
            currentUplineId = upline.uplineOf;
            level++;
        }

        const token = jwt.sign(
          { id: savedFranchise._id, email: savedFranchise.email },
          process.env.JWT_SECRET,
          { expiresIn: '7d' } // Token valid for 7 days
      );

        return res.status(201).json({
            message: 'Franchisee registered successfully.',
            token,
            franchise: savedFranchise,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while registering the franchise.' });
    }
});     

async function registerInAutoPool(franchise) {
  try {
    const { _id,name, password, email, mobileNumber, country, state, city, pinCode, package } = franchise;

    // **Generate Unique Code**
    let code;
    const lastFranchise = await AutoPoolModel.findOne().sort({ createdAt: -1 });
    if (lastFranchise && lastFranchise.code) {
      const lastCodeNumber = parseInt(lastFranchise.code.slice(1)) || 0; // Extract numeric part
      code = `f${lastCodeNumber + 1}`; // Generate the next code
    } else {
      code = "f1"; // Default to F1 if no franchise exists
    }

    // **Create New Franchise Instance**
    const newFranchise = new AutoPoolModel({
      name,
      password,
      email,
      mobileNumber,
      country,
      state,
      city,
      pinCode,
      package,
      code,
      franchiseId:_id
    });

    // **Check if AutoPool is Empty (No Franchises Exist)**
    const franchiseCount = await AutoPoolModel.countDocuments();

    if (franchiseCount === 0) {
      // If AutoPool is empty, this franchise will be the root franchise and has no upline.
      console.log("No franchises found, registering the root franchise.");
      // Save the root franchise
      const savedRootFranchise = await newFranchise.save();
      console.log("Root franchise registered successfully");
      return;
    }

    // **Autopool Logic**: Find a parent franchise with less than 3 uplines
    const parentFranchise = await AutoPoolModel.findOne({
      $expr: { $lt: [{ $size: "$uplines" }, 3] }, // Find franchise with less than 3 uplines
    });

    if (parentFranchise) {
      // Assign the new franchise's upline information
      console.log(parentFranchise._id)
      newFranchise.uplineOf = parentFranchise._id;

      // Add this new franchise to the parent franchise's uplines
      parentFranchise.uplines.push(newFranchise._id);
      
      // Save the updated parent franchise
      await parentFranchise.save();
      console.log("Franchise registered successfully under the parent franchise");
    } else {
      console.log("No available parent franchise with less than 3 uplines");
      return;
    }

    // Save the new franchise (if not the root franchise)
    const savedFranchise = await newFranchise.save();

    let currentUplineId = savedFranchise.uplineOf; 
        let level = 1; 
        const distributionAmount = 9; 
        
        while (currentUplineId && level <= 15) {
            const upline = await AutoPoolModel.findById(currentUplineId);
            if (!upline) break; 
              
            const franchiseIncome = await FranchiseModel.findById(upline.franchiseId);
            if(franchiseIncome){
              franchiseIncome.autoPoolIncome = upline.autoPoolIncome || []; 
              franchiseIncome.autoPoolIncome.push({
                  franchiseId:franchiseIncome._id, 
                  amount: distributionAmount,
                  level: level, 
              });
              franchiseIncome.totalAutopoolIncome = (franchiseIncome.totalAutopoolIncome || 0) + distributionAmount;

              if(franchiseIncome.package == "gold" && franchiseIncome.refTo?.length >= 3){
                franchiseIncome.wallet += distributionAmount
              }else{
                franchiseIncome.upgradeWallet += (distributionAmount * 80)/100
                franchiseIncome.wallet += (distributionAmount * 20)/100
              }

              if(franchiseIncome.package == "silver" && franchiseIncome.upgradeWallet >= 3304){
                franchiseIncome.package = "gold"
                franchiseIncome.upgradeWallet = franchiseIncome.upgradeWallet - 3304
                if(franchiseIncome.refTo?.length >=3 ){
                  franchiseIncome.wallet += franchiseIncome.upgradeWallet
                  franchiseIncome.upgradeWallet = 0
                }
                franchiseIncome.couponWallet += 5400
              const newCfc = await CFCModel.create({
                franchiseId : franchiseIncome._id
              })
    
              await newCfc.save()
              await GlobalCFCIncome.updateOne({}, { $inc: { totalIncome: 108 } }, { upsert: true });
              await GlobalCMCIncome.updateOne({}, { $inc: { totalIncome: 108 } }, { upsert: true });
              }
              await franchiseIncome.save();
            }
            currentUplineId = upline.uplineOf;
            level++;
        }

  } catch (error) {
    console.error("Error in registerInAutoPool:", error);
    console.log("An error occurred while registering the franchise");
  }
}

const allAutopoolFranchise = asyncHandler(async (req,res) => {
  try {
    // Fetch all franchises with their relations
    const franchises = await AutoPoolModel.find().populate('uplineOf') // Populate uplineOf with its code

    if (!franchises.length) {
      return res.status(404).json({ message: "No franchises found." });
    }

    // Respond with franchises and their populated relations
    res.status(200).json({
      message: "Franchises retrieved successfully.",
      franchises: franchises
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve franchises.", error: error.message });
  }
})

cron.schedule('0 21 * * *', async () => {
  try {``
    // Fetch the total global CFC income
    console.log(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const globalIncome = await GlobalCFCIncome.findOne();
    if (!globalIncome || globalIncome.totalIncome === 0) {
      console.log('No income to distribute.');
      return;
    }

    // Fetch all CFC members and filter out those whose totalEarnings >= 3540
    const cfcMembers = await CFCModel.find({ totalEarnings: { $lt: 3540 } });
    const memberCount = cfcMembers.length;

    if (memberCount === 0) {
      console.log('No CFC members eligible for distribution.');
      return;
    }

    // Calculate the income share per eligible member
    const sharePerMember = globalIncome.totalIncome / memberCount;

    // Distribute income to all eligible CFC members by updating their Franchise's cfcWallet

    const dailyReport = new DailyReportModel({
      date: new Date(),
      totalCfc: memberCount,
      totalCfcIncome:globalIncome.totalIncome,
      perCfcIncome: sharePerMember,
    });

    console.log(dailyReport)

    for (const member of cfcMembers) {
      // Fetch the associated Franchise and update cfcWallet
      const franchise = await FranchiseModel.findById(member.franchiseId);
     
      if (franchise) {
        dailyReport.franchises.push(franchise._id)
        franchise.cfcWallet += sharePerMember; // Increment the cfcWallet
        if(franchise.refTo?.length >= 3){
          franchise.wallet += sharePerMember
        }else{
          franchise.wallet += (sharePerMember *20)/100
            franchise.upgradeWallet += (sharePerMember *80)/100
        }

        
        await franchise.save(); // Save the updated franchise

        // Update the CFC member's totalEarnings
        member.totalEarnings += sharePerMember;
        await member.save(); // Save the updated CFC member's earnings
      } else {
        console.log(`Franchise with ID ${member.franchiseId} not found.`);
      }
    }
    await dailyReport.save()

    // Reset the global income pool
    globalIncome.totalIncome = 0;
    await globalIncome.save();


    const globalCmcIncome = await GlobalCMCIncome.findOne();
    if (!globalCmcIncome || globalCmcIncome.totalIncome === 0) {
      console.log('No income to distribute.');
      return;
    }

    // Fetch all CFC members and filter out those whose totalEarnings >= 3540
    const cmcMembers = await CMCModel.find();
    const cmcMemberCount = cmcMembers.length;

    if (cmcMemberCount === 0) {
      console.log('No CMC members eligible for distribution.');
      return;
    }

    // Calculate the income share per eligible member
    const cmcSharePerMember = globalCmcIncome.totalIncome / cmcMemberCount;
    // Distribute income to all eligible CFC members by updating their Franchise's cfcWallet

    dailyReport.totalCmc = cmcMemberCount;
    dailyReport.totalCmcIncome = globalCmcIncome.totalIncome;
    dailyReport.perCmcIncome = cmcSharePerMember;
    for (const member of cmcMembers) {
      // Fetch the associated Franchise and update cfcWallet
      const franchise = await FranchiseModel.findById(member.franchiseId);
      if (franchise) {
        dailyReport.franchises.push(franchise._id)
    console.log(cmcMemberCount)
    franchise.cmcWallet += cmcSharePerMember; // Increment the cfcWallet
    franchise.wallet+= franchise.cmcSharePerMember
        await franchise.save(); // Save the updated franchise

        // Update the CFC member's totalEarnings
        member.totalEarnings += cmcSharePerMember;
        await member.save(); // Save the updated CFC member's earnings
      } else {
        console.log(`Franchise with ID ${member.franchiseId} not found.`);
      }
    }
    await dailyReport.save()
    // Reset the global income pool
    globalCmcIncome.totalIncome = 0;
    await globalCmcIncome.save();


    console.log(`Distributed ${sharePerMember.toFixed(2)} to ${memberCount} eligible CFC members.`);
  } catch (error) {
    console.error('Error distributing income:', error);
  }
}, {
  timezone: 'Asia/Kolkata'
});

const loginFranchise = asyncHandler(async (req, res) => {
  let { code, password } = req.body;
  code = code ? code.toLowerCase() : code;
  try {
      // 1. Validate input
      if (!code || !password) {
          return res.status(400).json({ message: 'Code and password are required.' });
      }

      // 2. Find franchise by mobile number
      const franchise = await FranchiseModel.findOne({ code });
      if (!franchise) {
          return res.status(401).json({ message: 'Invalid credentials. Franchise not found.' });
      }

      // 3. Compare plain text password
      if (franchise.password !== password) {
          return res.status(401).json({ message: 'Invalid credentials. Password is incorrect.' });
      }

      // 4. Generate JWT token
      const token = jwt.sign(
          { id: franchise._id, email: franchise.email },
          process.env.JWT_SECRET,
          { expiresIn: '7d' } // Token valid for 7 days
      );

      // 5. Send response with token and franchise details
      res.status(200).json({
          message: 'Login successful.',
          token,
          franchise: {
              _id: franchise._id,
              name: franchise.name,
              code: franchise.code,
              mobileNumber: franchise.mobileNumber,
              state: franchise.state,
              city: franchise.city,
              package: franchise.package,
              email:franchise.email
          },
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'An error occurred while logging in.' });
  }
});

const getSingleFranchise = asyncHandler(async (req,res) => {
  try{
    const {id} = req.params
    const franchise = await FranchiseModel.findById(id).populate('kycId')

    if(!franchise){
      res.status(400).json({ message: 'Franchise not found' });
    }

    res.status(200).json({
      message: 'fetched franchise successfully',
      franchise
  });
  }catch(err){
    res.status(500).json({ message: 'An error occurred while fetchinmg franchise' });
  }
})

const uploadProfilePicture = asyncHandler(async (req, res) => {
  const { image, franchiseId } = req.body;

  if (!image || !franchiseId) {
      return res.status(400).json({ message: 'Image and franchiseId are required' });
  }

  try {
      const response = await imagekit.upload({
          file: image, 
          fileName: `profile_${franchiseId}`, 
          folder: "/profile_pictures" 
      });

      const franchise = await FranchiseModel.findById(franchiseId)
      franchise.profilePicture = response.url
      franchise.profilePictureFileId = response.fileId

      await franchise.save()

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
 const { franchiseId } = req.body;
 const newImage = req.files?.newImage;

 if (!newImage || !franchiseId) {
     return res.status(400).json({ message: 'New image and franchiseId are required' });
 }

 try {
     const franchise = await FranchiseModel.findById(franchiseId);
     if (!franchise) {
         return res.status(404).json({ message: 'User not found' });
     }

     if (franchise.profilePictureFileId) {
         await imagekit.deleteFile(franchise.profilePictureFileId)
             .catch((err) => {
                 console.error('Failed to delete old profile picture:', err.message);
             });
     }

     const uploadResponse = await imagekit.upload({
         file: newImage.data,
         fileName: `profile_${franchiseId}`,
         folder: "/profile_pictures"
     });

     await FranchiseModel.findByIdAndUpdate(franchiseId, {
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
  const { franchiseId } = req.params

  if (!franchiseId) {
      return res.status(400).json({ message: 'User ID is required' });
  }

  try {
      // Find the franchise by ID
      const franchise = await FranchiseModel.findById(franchiseId);
      if (!franchise) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Check if the franchise has an existing profile picture to delete
      if (franchise.profilePictureFileId) {
          // Delete the profile picture from ImageKit
          await imagekit.deleteFile(franchise.profilePictureFileId)
              .catch((err) => {
                  console.error('Failed to delete profile picture:', err.message);
                  return res.status(500).json({ message: 'Failed to delete profile picture', error: err.message });
              });

          // Remove the profile picture URL and file ID from the franchise document
          franchise.profilePicture = 'https://www.shutterstock.com/image-vector/user-profile-icon-vector-avatar-600nw-2247726673.jpg';
          franchise.profilePictureFileId = null;
          await franchise.save();

          return res.status(200).json({ message: 'Profile picture deleted successfully' });
      } else {
          return res.status(400).json({ message: 'No profile picture to delete' });
      }
  } catch (error) {
      res.status(500).json({ message: 'Failed to delete profile picture', error: error.message });
  }
});


const getFranchiseRelations = async (req, res) => {
    let { code } = req.params;

    code = code ? code.toLowerCase() : code;


    if (!code) {
        return res.status(400).json({ message: "Franchise code is required." });
    }

    try {
        // Find the franchise by code
        const franchise = await FranchiseModel.findOne({ code })
            .populate("uplineOf", "code") // Populate sublineOf with name and code
            .populate("refBy", "code");   // Populate refBy with name and code

        if (!franchise) {
            return res.status(404).json({ message: "Franchise not found." });
        }

        // Respond with sublineOf and refBy relationships
        res.status(200).json({
            message: "Franchise relations retrieved successfully.",
            franchise: {
                code: franchise.code,
                uplineOf: franchise.uplineOf,
                refBy: franchise.refBy,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to retrieve franchise relations.", error: error.message });
    }
};

const getAllFranchise = async (req, res) => {
    try {
      // Fetch all franchises with their relations
      const franchises = await FranchiseModel.find()
        .populate("uplineOf", "code") // Populate uplineOf with its code
        .populate("refBy", "code")
        .populate("kycId")   // Populate refBy with its code
  
      if (!franchises.length) {
        return res.status(404).json({ message: "No franchises found." });
      }
  
      // Respond with franchises and their populated relations
      res.status(200).json({
        message: "Franchises retrieved successfully.",
        franchises: franchises
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve franchises.", error: error.message });
    }
  };

  const createKYC = async (req, res) => {
    try {
      console.log(req.body);
      console.log(req.files);
  
      const {
        aadharCardNumber,
        panCardNumber,
        bankName,
        accountType,
        accountHolderName,
        accountNumber,
        reenterAccountNumber,
        ifscCode,
        dob,
        gender,
        email,
        address,
        maritalStatus,
        nomineeName,
        nomineeRelationship,
        nomineeDob,
        franchiseId,
      } = req.body;
  
      if (!franchiseId) {
        return res.status(400).json({ message: 'Franchise ID is required' });
      }
  
      const franchise = await FranchiseModel.findById(franchiseId);
      if (!franchise) {
        return res.status(404).json({ message: 'Franchise not found' });
      }
  
      const uploadFileToImageKit = async (file) => {
        try {
          const response = await imagekit.upload({
            file: file.data, // Pass file buffer
            fileName: file.name,
          });
          return response.url;
        } catch (error) {
          console.error('Error uploading to ImageKit:', error.message);
          throw error;
        }
      };
  
      const aadharCardFront = req.files?.aadharCardFront
        ? await uploadFileToImageKit(req.files.aadharCardFront)
        : null;
      const aadharCardBack = req.files?.aadharCardBack
        ? await uploadFileToImageKit(req.files.aadharCardBack)
        : null;
      const panCardFront = req.files?.panCardFront
        ? await uploadFileToImageKit(req.files.panCardFront)
        : null;
      const panCardBack = req.files?.panCardBack
        ? await uploadFileToImageKit(req.files.panCardBack)
        : null;
      const accountPassbookPhoto = req.files?.accountPassbookPhoto
        ? await uploadFileToImageKit(req.files.accountPassbookPhoto)
        : null;
      const nomineeAadharFront = req.files?.nomineeAadharFront
        ? await uploadFileToImageKit(req.files.nomineeAadharFront)
        : null;
      const nomineeAadharBack = req.files?.nomineeAadharBack
        ? await uploadFileToImageKit(req.files.nomineeAadharBack)
        : null;
  
      let kyc = await KycModel.findById(franchise.kycId);
  
      if (kyc) {
        // Update existing KYC
        const updatedData = {
          ...(aadharCardNumber && { aadharCardNumber }),
          ...(aadharCardFront && { aadharCardFront }),
          ...(aadharCardBack && { aadharCardBack }),
          ...(panCardNumber && { panCardNumber }),
          ...(panCardFront && { panCardFront }),
          ...(panCardBack && { panCardBack }),
          ...(bankName && { bankName }),
          ...(accountType && { accountType }),
          ...(accountHolderName && { accountHolderName }),
          ...(accountNumber && { accountNumber }),
          ...(reenterAccountNumber && { reenterAccountNumber }),
          ...(ifscCode && { ifscCode }),
          ...(dob && { dob }),
          ...(gender && { gender }),
          ...(email && { email }),
          ...(address && { address }),
          ...(maritalStatus && { maritalStatus }),
          ...(accountPassbookPhoto && {accountPassbookPhoto}),
          ...(nomineeName && { 'nominee.nomineeName': nomineeName }),
          ...(nomineeRelationship && { 'nominee.nomineeRelationship': nomineeRelationship }),
          ...(nomineeDob && { 'nominee.nomineeDob': nomineeDob }),
          ...(nomineeAadharFront && { 'nominee.aadharCardFront': nomineeAadharFront }),
          ...(nomineeAadharBack && { 'nominee.aadharCardBack': nomineeAadharBack }),
        };
  
        kyc = await KycModel.findByIdAndUpdate(franchise.kycId, updatedData, { new: true });
        return res.status(200).json({ message: 'KYC updated successfully', kyc });
      }
  
      // Create a new KYC if none exists
      const newKYC = new KycModel({
        aadharCardNumber,
        aadharCardFront,
        aadharCardBack,
        panCardNumber,
        panCardFront,
        panCardBack,
        bankName,
        accountType,
        accountHolderName,
        accountNumber,
        reenterAccountNumber,
        accountPassbookPhoto,
        ifscCode,
        dob,
        gender,
        email,
        address,
        maritalStatus,
        nominee: {
          aadharCardFront: nomineeAadharFront,
          aadharCardBack: nomineeAadharBack,
          nomineeName,
          nomineeRelationship,
          nomineeDob,
        },
      });
  
      const savedKYC = await newKYC.save();
  
      // Associate new KYC with Franchise
      franchise.kycId = savedKYC._id;
      await franchise.save();
  
      res.status(201).json({ message: 'KYC created successfully', kyc: savedKYC });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  };

  const editFranchise = async (req, res) => {
    const { franchiseId } = req.params; 
    const updateData = { ...req.body }; 
    
    try {
      const updatedFranchise = await FranchiseModel.findByIdAndUpdate(
        franchiseId,
        updateData,
        { new: true, runValidators: true }
      );
  
      if (!updatedFranchise) {
        return res.status(404).json({ message: 'Franchise not found' });
      }
  
      return res.status(200).json({
        message: 'Franchise updated successfully',
        data: updatedFranchise,
      });
    } catch (error) {
      console.error('Error updating franchise:', error);
      return res.status(500).json({
        message: 'An error occurred while updating the franchise',
        error: error.message,
      });
    }
  };

  const deleteFranchise = async (req, res) => {
    const { franchiseId } = req.params; // Franchise ID from the route parameters
  
    try {
      // Find the franchise by ID and delete it
      const deletedFranchise = await FranchiseModel.findByIdAndDelete(franchiseId);
  
      if (!deletedFranchise) {
        return res.status(404).json({ message: 'Franchise not found' });
      }
  
      return res.status(200).json({
        message: 'Franchise deleted successfully',
        data: deletedFranchise, // Return the deleted franchise's details if needed
      });
    } catch (error) {
      console.error('Error deleting franchise:', error);
      return res.status(500).json({
        message: 'An error occurred while deleting the franchise',
        error: error.message,
      });
    }
  };

  const generateRegistrationLink = (req, res) => {
    try {
      let { franchiseCode, uplineId, packageType } = req.body;

    uplineId = uplineId ? uplineId.toLowerCase() : uplineId;
    franchiseCode = franchiseCode ? franchiseCode.toLowerCase() : franchiseCode;


  
      if (!franchiseCode) {
        return res.status(400).json({ error: 'Franchise Code (refId) is required.' });
      }
  
      const baseURL = 'http://localhost:5173/register-franchise';
  
      const queryParams = new URLSearchParams();
      queryParams.append('refId', franchiseCode); // Mandatory refId (current franchise code)
  
      if (uplineId) {
        queryParams.append('uplineId', uplineId);
      }else{
        queryParams.append('uplineId', franchiseCode);
      }

      if (packageType) {
        queryParams.append('package', packageType);
      }
  
      const registrationLink = `${baseURL}?${queryParams.toString()}`;
  
      return res.status(200).json({ registrationLink });
    } catch (error) {
      console.error('Error generating registration link:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  const getFranchiseUplines = async (franchiseId) => {
    const franchise = await FranchiseModel.findById(franchiseId).populate('uplineOf').populate('uplines');

    if (!franchise) return null;

    const uplineData = {
        _id: franchise._id,
        name: franchise.name,
        mobileNumber: franchise.mobileNumber,
        profilePicture: franchise.profilePicture,
        package: franchise.package,
        children: [],
    };

    // Recursively fetch the uplines if any
    if (franchise.uplines && franchise.uplines.length > 0) {
        for (const upline of franchise.uplines) {
            const uplineInfo = await getFranchiseUplines(upline._id);
            uplineData.children.push(uplineInfo);
        }
    }

    return uplineData;
};

// Controller to handle the API request for upline tree
const getUplineTree = async (req, res) => {
    try {
        const { franchiseId } = req.params;

        const uplineTree = await getFranchiseUplines(franchiseId);

        if (!uplineTree) {
            return res.status(404).json({ message: 'Franchise not found' });
        }

        res.status(200).json(uplineTree);
    } catch (error) {
        console.error('Error fetching upline tree:', error);
        res.status(500).json({ message: 'Error fetching upline tree' });
    }
};

const franchiseTreeView = asyncHandler(async (req, res) => {
  const { franchiseId } = req.params;

  try {
    // Find the franchise using the provided ID
    const franchise = await FranchiseModel.findById(franchiseId).populate('uplines', 'name email code');
    if (!franchise) {
      return res.status(404).json({ message: 'Franchise not found.' });
    }

    // Recursive function to build the uplines tree with a depth limit
    const buildUplineTree = async (node, depth) => {
      // Stop recursion if depth exceeds 3
      if (depth > 3) {
        return null;
      }

      // Fetch uplines of the current node
      const uplines = await FranchiseModel.find({ _id: { $in: node.uplines } })
      .populate('refBy', 'name email code') // Populate refId
      .populate('uplineOf', 'name email code'); 

      // Recursively build the tree for each upline
      const parentUplines = await Promise.all(
        uplines.map(async (upline) => await buildUplineTree(upline, depth + 1))
      );

      return {
        node: {
          ...node.toObject(), // Convert the current node to an object for manipulation
          refBy: node.refBy, // Include populated refId
          uplineOf: node.uplineOf, // Include populated uplineId
        },
        uplines: parentUplines.filter((upline) => upline !== null), // Filter out null values
      };
    };

    // Build the tree starting from the given franchise with an initial depth of 1
    const uplineTree = await buildUplineTree(franchise, 1);

    return res.status(200).json({
      message: 'Franchise upline tree view fetched successfully.',
      uplineTree,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching the franchise upline tree.' });
  }
});

const getFranchiseTeam = asyncHandler(async (req, res) => {
  let { franchiseCode } = req.params; // Assuming franchise code is passed as a route param
  franchiseCode = franchiseCode ? franchiseCode.toLowerCase() : franchiseCode;

  try {
      // Find the current franchise by its code
      const currentFranchise = await FranchiseModel.findOne({ code: franchiseCode });
      if (!currentFranchise) {
          return res.status(404).json({ message: 'Franchise not found.' });
      }

      // Recursive function to get all referred franchises in a flat array
      const getReferredFranchises = async (franchise) => {
          let team = []; // Store all referred franchises in a flat array

          for (const referredId of franchise.refTo) {
              const referredFranchise = await FranchiseModel.findById(referredId).populate([
                { path: 'refBy', select: 'name code' }, // Populate refBy field
                { path: 'uplineOf', select: 'name code' }, // Populate uplineOf field
              ]);
              if (referredFranchise) {
                  team.push(referredFranchise.toObject()); // Add the current referred franchise
                  const subTeam = await getReferredFranchises(referredFranchise); // Recursively get sub-team
                  team = team.concat(subTeam); // Merge the sub-team into the flat array
              }
          }

          return team;
      };

      // Fetch all the direct and indirect referred franchises
      const team = await getReferredFranchises(currentFranchise);

      return res.status(200).json({
          message: 'Franchise team fetched successfully.',
          franchise: currentFranchise,
          team, // A single flat array of all team members
      });
  } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'An error occurred while fetching the franchise team.' });
  }
});

const getPayoutsByFranchise = async (req, res) => {
  try {
    const { franchiseId } = req.params; // Extract franchiseId from route params

    // Validate input
    if (!franchiseId) {
      return res.status(400).json({ success: false, message: 'Franchise ID is required.' });
    }

    // Find the franchise and populate the payOutDetails
    const franchise = await FranchiseModel.findById(franchiseId).populate('payOutDetails');

    if (!franchise) {
      return res.status(404).json({ success: false, message: 'Franchise not found.' });
    }

    // Return the populated payouts
    return res.status(200).json({
      success: true,
      message: 'Payouts retrieved successfully.',
      payouts: franchise.payOutDetails,
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const getDirectMembers = async (req, res) => {
  try {
    const { franchiseId } = req.params;

    // Find the franchise and populate retailMemberRef
    const franchise = await FranchiseModel.findById(franchiseId).populate({
      path: "retailMemberRef", // Populate retail members
      populate: {
        path: "plans.plan", // Nested populate for the `plans.plan` in the MemberModel
        model: "Plan", // Specify the model for `plan` if necessary
      },
    });

    if (!franchise) {
      return res.status(404).json({ message: "Franchise not found" });
    }

    // Get directly added members
    const directMembers = franchise.retailMemberRef;

    res.status(200).json({
      success: true,
      message: "Direct members fetched successfully",
      data: directMembers,
    });
  } catch (error) {
    console.error("Error fetching direct members:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getCouponMembers = async (req, res) => {
  try {
    const { franchiseId } = req.params;

    // Find the franchise and populate upgradeMemberRef
    const franchise = await FranchiseModel.findById(franchiseId).populate({
      path: "upgradeMemberRef", // Populate retail members
      populate: {
        path: "plans.plan", // Nested populate for the `plans.plan` in the MemberModel
        model: "Plan", // Specify the model for `plan` if necessary
      },
    });

    if (!franchise) {
      return res.status(404).json({ message: "Franchise not found" });
    }

    // Get members added via coupons
    const couponMembers = franchise.upgradeMemberRef;

    res.status(200).json({
      success: true,
      message: "Coupon members fetched successfully",
      data: couponMembers,
    });
  } catch (error) {
    console.error("Error fetching coupon members:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getReferredFranchises = async (req, res) => {
  try {
    const {franchiseId} = req.params; // assuming the franchise ID is passed in the route
    
    // Find the franchise by ID and populate the 'refTo' field
    const franchise = await FranchiseModel.findById(franchiseId)
    .populate({
      path: 'refTo',  // Populate the 'refTo' array
      populate: [
        { path: 'refBy' },  // Populate the 'refBy' field inside each 'refTo'
        { path: 'uplineOf' }  // Populate the 'uplineOf' field inside each 'refTo'
      ]
    });
    
    if (!franchise) { 
      return res.status(404).json({ message: 'Franchise not found' });
    }
    console.log(franchise)
    // Return the populated 'refTo' franchises
    return res.status(200).json({ franchises: franchise.refTo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const approveKYC = async (req, res) => {
  const { franchiseId } = req.params;

  try {
    // Find the franchise and get the kycId
    const franchise = await FranchiseModel.findById(franchiseId);

    if (!franchise || !franchise.kycId) {
      return res.status(404).json({ 
        success: false, 
        message: "Franchise not found or KYC not associated." 
      });
    }

    // Update the approved field in the KYC document
    const kyc = await KycModel.findById(franchise.kycId);

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found.",
      });
    }

    kyc.approved = "Approved";
    kyc.rejectReason = "";

    await kyc.save(); // Save the changes

    res.status(200).json({
      success: true,
      message: "KYC approved successfully.",
      franchise,
      kyc,
    });
  } catch (error) {
    console.error("Error approving KYC:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const approveAadhar = async (req, res) => {
  const { franchiseId } = req.params;

  try {
    // Find the franchise and get the kycId
    const franchise = await FranchiseModel.findById(franchiseId);

    if (!franchise || !franchise.kycId) {
      return res.status(404).json({ 
        success: false, 
        message: "Franchise not found or KYC not associated." 
      });
    }

    // Update the approved field in the KYC document
    const kyc = await KycModel.findById(franchise.kycId);

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found.",
      });
    }

    kyc.aadharCardApproved = "Approved";
    kyc.aadharCardReject = "";

    await kyc.save(); // Save the changes

    res.status(200).json({
      success: true,
      message: "aadhar card approved successfully.",
      franchise,
      kyc,
    });
  } catch (error) {
    console.error("Error approving Aadharcard:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const approvePanCard = async (req, res) => {
  const { franchiseId } = req.params;

  try {
    // Find the franchise and get the kycId
    const franchise = await FranchiseModel.findById(franchiseId);

    if (!franchise || !franchise.kycId) {
      return res.status(404).json({ 
        success: false, 
        message: "Franchise not found or KYC not associated." 
      });
    }

    // Update the approved field in the KYC document
    const kyc = await KycModel.findById(franchise.kycId);

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found.",
      });
    }

    kyc.panCardApproved = "Approved";
    kyc.panCardReject = "";

    await kyc.save(); // Save the changes

    res.status(200).json({
      success: true,
      message: "Pan Card approved successfully.",
      franchise,
      kyc,
    });
  } catch (error) {
    console.error("Error approving Pancard:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const rejectKYC = async (req, res) => {
  const { franchiseId } = req.params;
  const {reason} = req.body

  try {
    // Find the franchise and get the kycId
    const franchise = await FranchiseModel.findById(franchiseId);

    if (!franchise || !franchise.kycId) {
      return res.status(404).json({ 
        success: false, 
        message: "Franchise not found or KYC not associated." 
      });
    }

    // Update the approved field in the KYC document
    const kyc = await KycModel.findById(franchise.kycId);

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found.",
      });
    }

    kyc.approved = "Rejected";
    kyc.rejectReason = reason;

    await kyc.save(); // Save the changes

    res.status(200).json({
      success: true,
      message: "KYC approved successfully.",
      franchise,
      kyc,
    });
  } catch (error) {
    console.error("Error approving KYC:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const rejectAadhar = async (req, res) => {
  const { franchiseId } = req.params;
  const {reason} = req.body

  try {
    // Find the franchise and get the kycId
    const franchise = await FranchiseModel.findById(franchiseId);

    if (!franchise || !franchise.kycId) {
      return res.status(404).json({ 
        success: false, 
        message: "Franchise not found or KYC not associated." 
      });
    }

    // Update the approved field in the KYC document
    const kyc = await KycModel.findById(franchise.kycId);

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found.",
      });
    }

    kyc.aadharCardApproved = "Rejected";
    kyc.aadharCardReject = reason;

    await kyc.save(); // Save the changes

    res.status(200).json({
      success: true,
      message: "aadhar card approved successfully.",
      franchise,
      kyc,
    });
  } catch (error) {
    console.error("Error approving Aadharcard:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const rejectPanCard = async (req, res) => {
  const { franchiseId } = req.params;
  const {reason} = req.body

  try {
    // Find the franchise and get the kycId
    const franchise = await FranchiseModel.findById(franchiseId);

    if (!franchise || !franchise.kycId) {
      return res.status(404).json({ 
        success: false, 
        message: "Franchise not found or KYC not associated." 
      });
    }

    // Update the approved field in the KYC document
    const kyc = await KycModel.findById(franchise.kycId);

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found.",
      });
    }

    kyc.panCardApproved = "Rejected";
    kyc.panCardReject = reason;

    await kyc.save(); // Save the changes

    res.status(200).json({
      success: true,
      message: "Pan Card approved successfully.",
      franchise,
      kyc,
    });
  } catch (error) {
    console.error("Error approving Pancard:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};


const requestPayout = async (req, res) => {
  try {
    const { franchiseId } = req.body; // Get franchise ID from the request body
    const { amount } = req.body; // Amount to be requested

    // Validate the input
    if (!franchiseId || !amount) {
      return res.status(400).json({ success: false, message: 'Franchise ID and amount are required.' });
    }

    // Find the franchise
    const franchise = await FranchiseModel.findById(franchiseId).populate('kycId');
    if (!franchise) {
      return res.status(404).json({ success: false, message: 'Franchise not found.' });
    }

    // Create a new payout request
    const newPayout = new PayOutModel({
      reqAmount:amount,
      status: false, // Payout is initially pending
      franchiseId,
      
    });

    if(franchise?.kycId?.pancardApproved == "Approved"){
      newPayout.panCardApproved = true
      const deduction = (amount * 2)/100
      newPayout.amount = amount - deduction
    }else{
      const deduction = (amount * 20)/100
      newPayout.amount = amount - deduction
    }

    
    // Save the payout
    const savedPayout = await newPayout.save();

    // Add the payout to the franchise's payOutDetails array
    franchise.wallet = 0
    franchise.payOutDetails.push(savedPayout._id);
    await franchise.save();

    return res.status(201).json({
      success: true,
      message: 'Payout request created successfully.',
      payout: savedPayout,
    });
  } catch (error) {
    console.error('Error requesting payout:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const getAllPayout = async (req, res) => {
  try {

    // Populate franchiseId and nested kycId inside FranchiseModel
    const allPayouts = await PayOutModel.find()
      .populate({
        path: "franchiseId", // Populate franchiseId first
        populate: {
          path: "kycId", // Then populate kycId inside the FranchiseModel
        },
      });

    return res.status(201).json({
      success: true,
      message: "All payouts.",
      payout: allPayouts,
    });
  } catch (error) {
    console.error("Error fetching payout:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const updatePayoutStatus = async (req, res) => {
  const { payoutId } = req.params; // Payout ID passed in the request URL
  const {reason,status} = req.body
  try {
    // Find the payout by ID and update its status to true
    const updatedPayout = await PayOutModel.findById(payoutId);
    updatedPayout.rejectReason = reason
    updatedPayout.status = status
    await updatedPayout.save()

    if (!updatedPayout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payout status updated successfully.',
      payout: updatedPayout,
    });
  } catch (error) {
    console.error('Error updating payout status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.',
      error: error.message,
    });
  }
};

const getReportByDate = async (req, res) => {
  try {
    // Extract the date from the request parameters or body
    const { date } = req.params;

    // Parse the date from the request (ensure the date is in proper format)
    const parsedDate = new Date(date);

    // Ensure the parsed date is valid
    if (isNaN(parsedDate)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Query the DailyReport model to find the report by the given date
    const report = await DailyReportModel.findOne({
      date: { $gte: parsedDate.setHours(0, 0, 0, 0), $lt: parsedDate.setHours(23, 59, 59, 999) }
    })
      .populate('franchises'); // Populate the franchises array with Franchise data

    // If no report is found, return an appropriate message
    if (!report) {
      return res.status(404).json({ message: 'Report not found for the given date' });
    }

    // Return the found report as a response
    return res.status(200).json(report);
  } catch (error) {
    console.error('Error fetching the report:', error);
    return res.status(500).json({ error: 'An error occurred while fetching the report' });
  }
};

module.exports = {registerFranchise,uploadProfilePicture,editProfilePicture,deleteProfilePicture,getFranchiseRelations,getAllFranchise,createKYC,getReferredFranchises,editFranchise,deleteFranchise,generateRegistrationLink,getUplineTree,loginFranchise,getSingleFranchise,requestPayout,getPayoutsByFranchise,getDirectMembers,getCouponMembers,approveKYC,getAllPayout,updatePayoutStatus,approveAadhar,approvePanCard,rejectKYC,rejectAadhar,rejectPanCard,getFranchiseTeam,franchiseTreeView,getReportByDate,allAutopoolFranchise};
