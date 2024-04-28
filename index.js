const express=require('express'); 
const app=express();

const port = 3001;

app.get("/api", function(req,res){
  res.json({"users": ["userOne", "userTwo", "userThree"]})
});

app.listen(port, function(){
        console.log("SERVER STARTED ON localhost:"+port);     
})