const FranchiseModel = require('../models/FranchiseModel');

const registerFranchise = async (req, res) => {
    const { name, refById } = req.body;

    if (!name) {
        return res.status(400).json({ message: "Franchise name is required." });
    }

    try {
        // Generate a unique code for the new franchise
        const totalFranchises = await FranchiseModel.countDocuments({});
        const newCode = `f${totalFranchises + 1}`;

        let referringFranchise = null;

        // If refById is provided as a code, resolve the referring franchise
        if (refById) {
            referringFranchise = await FranchiseModel.findOne({ code: refById });
            if (!referringFranchise) {
                return res.status(404).json({ message: "Referring franchise not found." });
            }
        }

        // Find all top-level franchises (those without an `uplineOf`)
        const topLevelFranchises = await FranchiseModel.find({ uplineOf: null });

        if (topLevelFranchises.length === 0) {
            // Create a top-level franchise if no franchises exist
            const newFranchise = new FranchiseModel({
                name,
                code: newCode,
            });
            await newFranchise.save();
            return res.status(201).json({
                message: "Top-level franchise registered successfully.",
                franchise: newFranchise,
            });
        }

        // Use BFS to find the first franchise with fewer than 3 uplines
        let franchiseQueue = [...topLevelFranchises];

        while (franchiseQueue.length > 0) {
            const currentFranchise = franchiseQueue.shift();

            // Check if the current franchise has fewer than 3 uplines
            if (currentFranchise.uplines.length < 3) {
                const newFranchise = new FranchiseModel({
                    name,
                    code: newCode,
                    refBy: referringFranchise ? referringFranchise._id : null, // Referrer's ID (if available)
                    uplineOf: currentFranchise._id, // Immediate parent franchise
                });

                await newFranchise.save();

                // Add the new franchise to the current franchise's uplines
                currentFranchise.uplines.push(newFranchise._id);
                await currentFranchise.save();

                return res.status(201).json({
                    message: "Franchise registered successfully under the first available slot.",
                    franchise: newFranchise,
                });
            }

            // If full, add the sub-franchises to the queue for further searching
            const uplineFranchises = await FranchiseModel.find({
                _id: { $in: currentFranchise.uplines },
            });
            franchiseQueue.push(...uplineFranchises);
        }

        res.status(400).json({ message: "No available slot found for new franchise." });
    } catch (error) {
        res.status(500).json({ message: "Failed to register franchise.", error: error.message });
    }
};

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
  

module.exports = {registerFranchise,getFranchiseRelations,getAllFranchise};
