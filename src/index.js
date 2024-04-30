const express=require('express'); 
require('dotenv').config();

const app=express();
const port = process.env.PORT;

//app.use(cors());
app.use(express.json());

app.use("/register", require("./routes/register"));
app.use("/login", require("./routes/login"));

app.get("/api", function(req,res){
  res.json({"users": ["userOne", "userTwo", "userThree"]})
});

app.listen(port, function(){
        console.log("SERVER STARTED ON localhost:"+port);     
})