const ImageKit = require('imagekit');

// Initialize ImageKit with your credentials
const imagekit = new ImageKit({
    publicKey: process.env.PUBLIC_KEY,   // Public API Key from your ImageKit dashboard
    privateKey: process.env.PRIVATE_KEY, // Private API Key from your ImageKit dashboard
    urlEndpoint: process.env.URL_ENDPOINT // Your URL endpoint from the dashboard
});

module.exports = imagekit;
