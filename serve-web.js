const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all routes by serving index.html (for React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 TaskMate web app is running at:`);
  console.log(`   🌐 Local: http://localhost:${PORT}`);
  console.log(`   📱 Share this link with anyone!`);
  console.log(`   🔄 Press Ctrl+C to stop the server`);
});
