const expressAsyncHandler = require('express-async-handler');
const FranchiseModel = require('../models/FranchiseModel');
const imagekit = require('../config/imageKit');
const KycModel = require('../models/KycModel');


const registerFranchise = expressAsyncHandler(async (req, res) => {
    let { name, refBy, uplineId } = req.body;

    try {
        // Automatically generate a sequential code if not provided
        let code;
        const lastFranchise = await FranchiseModel.findOne().sort({ createdAt: -1 });
        if (lastFranchise && lastFranchise.code) {
            const lastCodeNumber = parseInt(lastFranchise.code.slice(1)) || 0; // Extract numeric part
            code = `F${lastCodeNumber + 1}`; // Generate the next code
        } else {
            code = 'F1'; // Default to F1 if no franchise exists
        }

        // If no uplineId and refBy are provided, create the root franchise
        if (!uplineId && !refBy) {
            const rootFranchise = new FranchiseModel({
                name,
                code,
                refBy: null, // No referrer
                uplineOf: null, // No upline
                uplines: [], // No uplines
            });

            const savedFranchise = await rootFranchise.save();

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

            for (const childId of root.refTo) {
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
                if (current.refTo.length < 3) {
                    return current; // Return the first node with an available slot
                }
        
                // Add the current node's children to the queue for further processing
                for (const childId of current.refTo) {
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
            uplines: [...availableParent.uplines, availableParent._id], // Inherit upline chain
        });

        // Save the new franchise
        const savedFranchise = await newFranchise.save();

        // 4. Update the parent's downline reference
        availableParent.refTo.push(savedFranchise._id);
        await availableParent.save();

        return res.status(201).json({
            message: 'Franchisee registered successfully.',
            franchise: savedFranchise,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while registering the franchise.' });
    }
});

const getFranchiseRelations = async (req, res) => {
    const { code } = req.params;

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
        .populate("refBy", "code");   // Populate refBy with its code
  
      if (!franchises.length) {
        return res.status(404).json({ message: "No franchises found." });
      }
  
      // Respond with franchises and their populated relations
      res.status(200).json({
        message: "Franchises retrieved successfully.",
        franchises: franchises.map((franchise) => ({
          id: franchise._id,
          name: franchise.name,
          mobileNumber: franchise.mobileNumber,
          state: franchise.state,
          city: franchise.city,
          code: franchise.code,
          uplineOf: franchise.uplineOf,
          refBy: franchise.refBy,
        })),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve franchises.", error: error.message });
    }
  };

const createKYC = async (req, res) => {
  try {
    const { franchiseId } = req.params; // Franchise ID
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
      nomineeDob
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
                fileName: file.name
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

    // Create KYC document
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
        nomineeDob
      }
    });

    const savedKYC = await newKYC.save();

    // Associate KYC with Franchise
    franchise.kycId = savedKYC._id;
    await franchise.save();

    res.status(201).json({ message: 'KYC created successfully', kyc: savedKYC });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const getReferredFranchises = async (req, res) => {
    try {
      const { franchiseId } = req.params; // Extract franchise ID from request parameters
  
      if (!franchiseId) {
        return res.status(400).json({ message: 'Franchise ID is required' });
      }
  
      // Check if the franchise exists
      const currentFranchise = await FranchiseModel.findById(franchiseId);
      if (!currentFranchise) {
        return res.status(404).json({ message: 'Franchise not found' });
      }
  
      // Find all franchises referred by the current franchise
      const referredFranchises = await FranchiseModel.find({ refBy: franchiseId });
  
      res.status(200).json({
        message: 'Referred franchises retrieved successfully',
        franchises: referredFranchises,
      });
    } catch (error) {
      console.error('Error fetching referred franchises:', error.message);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  };
  

module.exports = {registerFranchise,getFranchiseRelations,getAllFranchise,createKYC,getReferredFranchises};
