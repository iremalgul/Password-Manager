const express = require('express');
const app = express();
const testRoutes = require('./routes/test');

// Middleware
app.use(express.json());

// Add test routes
app.use('/api/test', testRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 