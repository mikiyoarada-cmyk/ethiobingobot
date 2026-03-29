const express = require("express");
const app = express();

// serve web app
app.use(express.static("public"));

// test route
app.get("/test", (req, res) => {
  res.send("Bot is working!");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on port " + PORT));