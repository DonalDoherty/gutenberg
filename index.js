const express = require('express');
require('dotenv').config();
const cors = require('cors');

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json());

app.use("/register", require("./src/routes/register"));
app.use("/login", require("./src/routes/login"));
app.use("/dashboard", require("./src/routes/dashboard"));
app.use("/book", require("./src/routes/book/book"));

app.get("/api", function (req, res) {
  res.json({ "users": ["userOne", "userTwo", "userThree"] })
});

app.listen(port, function () {
  console.log("SERVER STARTED ON localhost:" + port);
})