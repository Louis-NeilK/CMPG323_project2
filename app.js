const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

let port = process.env.PORT;
if (port == null || port == "") {
	port = 3000;
}
server.listen(port, function () {
	console.log("Server started successfully.");
});