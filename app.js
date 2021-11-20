require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const mongoose = require("mongoose");
const session = require("express-session");
const MemoryStore = require("memorystore")(session);
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const AWS = require("aws-sdk");
const fs = require("fs");

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, "public/images/");
	},
	filename: function (req, file, cb) {
		cb(null, file.originalname);
	},
});
const fileFilter = (req, file, cb) => {
	if (
		file.mimetype === "image/jpg" ||
		file.mimetype === "image/png" ||
		file.mimetype === "image/jpeg"||
		file.mimetype === "image/bmp" ||
		file.mimetype === "image/ico" ||
		file.mimetype === "image/gif"||
		file.mimetype === "image/tiff"

	) {
		cb(null, true);
	} else {
		cb(null, false);
	}
};
const upload = multer({
	storage: storage,
	limits: {
		fileSize: 1024 * 1024 * 10,
	},
	fileFilter: fileFilter,
});
const s3 = new AWS.S3({
	accessKeyId: process.env.ID,
	secretAccessKey: process.env.SECRET,
});
const uploadFile = (fileName, saveName, where) => {
	const fileContent = fs.readFileSync(fileName);
	const params = {
		Bucket: process.env.BUCKET_NAME,
		Key: where + saveName,
		Body: fileContent,
	};
	s3.upload(params, function (err, data) {
		if (err) {
			throw err;
		}
	});
};

const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(
	session({
		cookie: {
			maxAge: 86400000,
		},
		store: new MemoryStore({
			checkPeriod: 86400000,
		}),
		secret: process.env.MY_SECRET,
		resave: false,
		saveUninitialized: false,
	})
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.mongoURI);

const userSchema = new mongoose.Schema({
	username: String,
	password: String,
	name: String,
	access: Number,
	sharedPhotos: Array,
	requests: Array
})
// SharedPhotos = {
// 	id: String,
// 	access: Boolean
// }
const photoSchema = new mongoose.Schema({
	name: String,
	location: String,
	link: String,
	tags: String,
	createdBy: String,
	createdByName: String,
	createdByEmail: String,
	createdDate: Date,
	accessLevel: Number
})
userSchema.plugin(passportLocalMongoose);
const Photo = mongoose.model("Photo", photoSchema);
const User = mongoose.model("User", userSchema);
passport.use(User.createStrategy());


passport.serializeUser(function (user, done) {
	done(null, user.id);
});
passport.deserializeUser(function (id, done) {
	User.findById(id, function (err, user) {
		done(err, user);
	});
});

function usernameToLowerCase(req, res, next) {
	req.body.username = req.body.username.toLowerCase();
	next();
}

app.get("/", function(req, res){
    res.render("index")
})

app.post("/signup", usernameToLowerCase, function(req, res){
	try {
		User.register({username: req.body.username}, req.body.password, function(err, user){
			if (err){
				console.log(err)
				res.redirect("/")
			}else{
				user.name = req.body.name;
				user.access = req.body.access;
				user.save();
				passport.authenticate("local", {failureRedirect: "/"})(req, res, function(){
					res.redirect("/myphotos");
				})
			}
		})
	} catch (e) {
		console.log(e);
		res.redirect("/");
	}
})

app.post("/signin", usernameToLowerCase, function(req, res){
	try {
		const user = new User({
			username: req.body.username,
			password: req.body.password
		})	
		req.login(user, function(err){
			if (err){
				console.log(err);
			}else{
				passport.authenticate("local", {failureRedirect: "/"})(req, res, function(){
					res.redirect("/myphotos");
				})
			}
		})
	} catch (e) {
		console.log(e);
		res.redirect("/");
	}
})

app.get("/myphotos", function(req, res){
	try {
		if (req.isAuthenticated()){
			Photo.find({createdBy: req.user._id}, function(err, photos){
				if (err){
					console.log(err);
					res.redirect("/")
				}else{
					res.render("myphotos", {photos: photos})
				}
			})
		}else{
			res.redirect("/");
		}
	} catch (e) {
		console.log(e);
		res.redirect("/");
	}
})

app.get("/sharedphotos", function(req, res){
	try {
		if (req.isAuthenticated()){
			res.render("sharedphotos")
		}else{
			res.redirect("/");
		}
	} catch (e) {
		console.log(e);
		res.redirect("/");
	}
})

app.get("/uploadphoto", function(req, res){
	try {
		if (req.isAuthenticated()){
			res.render("upload")
		}else{
			res.redirect("/");
		}
	} catch (e) {
		console.log(e);
		res.redirect("/");
	}
})

app.post("/uploadPic", upload.single("uploadImage"), function(req, res){
	try {
		if (req.isAuthenticated()) {
			let d = new Date();
			let extra = Math.floor(Math.random() * 1000) + 1;
			let extArray = req.file.mimetype.split("/");
			let extension = extArray[extArray.length - 1];
			let saveFileName = req.body.picName + extra + "." + extension;
			let img = "https://dnbiz7t7ahp8j.cloudfront.net/cmpg323_project/" + saveFileName;
			uploadFile("public/images/" + req.file.originalname,saveFileName,"cmpg323_project/");
			fs.unlinkSync("public/images/" + req.file.originalname);
			const pic = new Photo({
				name: req.body.picName,
				location: req.body.picLocation,
				link: img,
				tags: req.body.picTags,
				createdBy: req.user._id,
				createdDate: d,
				accessLevel: req.body.picAccess,
				createdByName: req.user.name
			})
			pic.save();
			res.redirect("/myphotos")
		} else {
			res.redirect("/");
		}
	} catch (e) {
		console.log(e);
		res.redirect("/");
	}
})

app.post("/editMeta", function(req, res){
	try {
		if (req.isAuthenticated()) {
			Photo.findOne({_id: req.body.picID}, function(err, p){
				if (err){
					console.log(err);
					res.redirect("/myphotos")
				}else{
					p.name = req.body.picName;
					p.location = req.body.picLocation;
					p.tags = req.body.picTags;
					p.accessLevel = req.body.picAccess;
					p.save();
				}
			})
			res.redirect("/myphotos")
		} else {
			res.redirect("/");
		}
	} catch (e) {
		console.log(e);
		res.redirect("/");
	}
})

app.post("/deletePic", function(req, res){
	try {
		if (req.isAuthenticated()){
			var pars = {
				Bucket: process.env.BUCKET_NAME,
				Key: "cmpg323_project/" + delFile,
			};
			s3.deleteObject(pars, function (err, data) {
				if (err) {
					console.log(err, err.stack);
				}else{
					res.render("myphotos")
				}
			});
		}else{
			res.redirect("/");
		}
	} catch (e) {
		console.log(e);
		res.redirect("/");
	}
})
app.get("/logout", function (req, res) {
	try {
		if (req.isAuthenticated()){
			req.logout();
			res.redirect("/");
		}else{
			res.redirect("/");
		}
	} catch (e) {
		console.log(e);
		res.redirect("/");
	}
});

app.use(function (req, res, next) {
	res.status(404).render("404");
});


let port = process.env.PORT;
if (port == null || port == "") {
	port = 3000;
}
app.listen(port, function () {
	console.log("Server started successfully.");
});