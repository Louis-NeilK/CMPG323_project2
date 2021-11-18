require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.get("/", function(req, res){
    res.render("index")
})

app.get("/myphotos", function(req, res){
    res.render("myphotos")
})

app.get("/sharedphotos", function(req, res){
    res.render("sharedphotos")
})


let port = process.env.PORT;
if (port == null || port == "") {
	port = 3000;
}
app.listen(port, function () {
	console.log("Server started successfully.");
});