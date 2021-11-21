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
// 	_id: String,
// 	access: Boolean
// }

// requests = {
// 	photoID: String,
// 	photoName = String,
// 	userID: String,
// 	userName: String
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
    res.render("index", {sError: false, lError: false})
})

app.get("/invalidLogin", function(req, res){
    res.render("index", {sError: false, lError: true})
})

app.get("/invalidSignup", function(req, res){
    res.render("index", {sError: true, lError: false})
})

app.post("/signup", usernameToLowerCase, function(req, res){
	try {
		User.findOne({username: req.body.username}, function(err, fUser){
			if (err){
				console.log(err);
				res.redirect("/");
			}else{
				if (fUser){
					res.redirect("/invalidSignup");
				}else{
					User.register({username: req.body.username}, req.body.password, function(err, user){
						if (err){
							console.log(err)
							res.redirect("/")
						}else{
							user.name = req.body.name;
							user.access = req.body.access;
							user.save();
							passport.authenticate("local", {failureRedirect: "/invalidLogin"})(req, res, function(){
								res.redirect("/myphotos");
							})
						}
					})
				}
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
				passport.authenticate("local", {failureRedirect: "/invalidLogin"})(req, res, function(){
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
					res.render("myphotos", {photos: photos, deleted: false, shared: "none", user: req.user})
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

async function getPhoto(req, i){
	return Photo.findOne({_id: req.user.sharedPhotos[i]._id})
}

async function getPhotos(req){
	let photos = [];
	for (let i = 0; i < req.user.sharedPhotos.length; i++){
		let p = await getPhoto(req, i)
		if (p){
			let obj = {
				_id: p._id,
				name: p.name,
				link: p.link,
				location: p.location,
				tags: p.tags,
				createdDate: p.createdDate,
				accessLevel: p.accessLevel,
				createdByName: p.createdByName,
				visible: req.user.sharedPhotos[i].access
			}
			photos.push(obj);
		}else{
			User.findOneAndUpdate({_id: req.user._id}, {$pull: {sharedPhotos: {_id: req.user.sharedPhotos[i]._id}}}, function(err){
				if (err){
					console.log(err);
					res.redirect("/myphotos")
				}
			})			
		}
	}	
	return photos;
}

async function getSharedPhotos(req, res){
	try {
		if (req.isAuthenticated()){
			let photos = await getPhotos(req);
			res.render("sharedphotos", {photos: photos, requested: false, deleted: false, search: false, searchTerm: ""});
		}else{
			res.redirect("/");
		}
	} catch (e) {
		console.log(e);
		res.redirect("/");
	}
}

app.get("/sharedphotos", function(req, res){
	getSharedPhotos(req, res);
})

async function getAccessPage(req, res){
	try {
		if (req.isAuthenticated()) {
			let photos = await getPhotos(req);
			Photo.findOne({_id: req.body.picID}, function(err, p){
				if (err){
					console.log(err);
					res.redirect("/myphotos")
				}else{
					User.findOne({_id: p.createdBy}, function(err, u){
						if (err){
							console.log(err);
							res.redirect("/sharedphotos")
						}else{
							let obj = {
								photoID: p._id,
								photoName: p.name,
								userID: req.user._id,
								userName: req.user.name
							}
							u.requests.push(obj);
							u.save();
							res.render("sharedphotos", {photos: photos, requested: true, deleted: false, search: false, searchTerm: ""});
						}
					})
				}
			})
		} else {
			res.redirect("/");
		}
	} catch (e) {
		console.log(e);
		res.redirect("/");
	}
}
app.post("/requestAccess", function(req, res){
	getAccessPage(req, res);
})

app.post("/search", function(req,res){
	try {
		if (req.isAuthenticated()) {
			Photo.find({$or: [{name: {$regex: req.body.searchQuery,	$options: "i",},}, {location: {$regex: req.body.searchQuery, $options: "i",},}, {tags: {$regex: req.body.searchQuery, $options: "i",},},]}, function (err, results) {
					if (!err) {
						let fotos = [];
						for (let i = 0; i < req.user.sharedPhotos.length; i++){
							for (let j = 0; j < results.length; j++){
								console.log(req.user.sharedPhotos[i]._id)
								console.log(results[j]._id)
								if (req.user.sharedPhotos[i]._id.toString() === results[j]._id.toString()){
									console.log("in")
									let obj = {
										_id: results[j]._id,
										name: results[j].name,
										link: results[j].link,
										location: results[j].location,
										tags: results[j].tags,
										createdDate: results[j].createdDate,
										accessLevel: results[j].accessLevel,
										createdByName: results[j].createdByName,
										visible: req.user.sharedPhotos[i].access
									}
									fotos.push(obj);
								}
							}
						}
						console.log("end")
						res.render("sharedphotos", {photos: fotos, requested: false, deleted: false, search: true, searchTerm: req.body.searchQuery});
					} else {
						console.log(err);
						res.redirect("/myphotos");
					}
				}
			);
		} else {
			res.redirect("/");
		}
	} catch (e) {
		console.log(e);
		res.redirect("/");
	}
})

app.post("/grantAccess", function(req, res){
	try {
		if (req.isAuthenticated()){
			User.findOne({_id: req.user._id}, function(err, me){
				if (err){
					console.log(err);
					res.redirect("/myphotos");
				}else{
					let reqID = req.user.requests[0].userID;
					let photoID =req.user.requests[0].photoID;
					me.requests.shift();
					me.save();
					User.findOne({_id: reqID}, function(err, u){
						if (err){
							console.log(err);
							res.redirect("/myphotos");
						}else{
							for (let i = 0; i < u.sharedPhotos.length; i++){
								if (u.sharedPhotos[i]._id.toString() === photoID.toString()){
									User.findOneAndUpdate({_id: reqID}, {$pull: {sharedPhotos: {_id: photoID}}}, function(err, us){
										if (err){
											console.log(err);
											res.redirect("/myphotos");
										}else{
											let obj = {
												_id: photoID,
												access: true
											}
											us.sharedPhotos.push(obj)
											us.save();
											res.redirect("/myphotos");
										}
									})				
								}
							}
						}
					})
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

app.post("/denyAccess", function(req, res){
	try {
		if (req.isAuthenticated()){
			User.findOne({_id: req.user._id}, function(err, me){
				if (err){
					console.log(err);
					res.redirect("/myphotos");
				}else{
					me.requests.shift();
					me.save();
					res.redirect("/myphotos");
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

app.get("/uploadphoto", function(req, res){
	try {
		if (req.isAuthenticated()){
			res.render("upload", {error: false})
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
		res.render("upload", {error: true});
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
			if (req.body.site === "my"){
				res.redirect("/myphotos")
			}else{
				res.redirect("/sharedphotos")
			}
		} else {
			res.redirect("/");
		}
	} catch (e) {
		console.log(e);
		res.redirect("/");
	}
})

app.post("/sharePic", function(req, res){
	try {
		if (req.isAuthenticated()) {
			Photo.find({createdBy: req.user._id}, function(err, photos){
				if (err){
					console.log(err);
					res.redirect("/")
				}else{
					Photo.findOne({_id: req.body.picID}, function(err, p){
						if (err){
							console.log(err);
							res.redirect("/myphotos")
						}else{
							User.findOne({username: req.body.email}, function(err, u){
								if (err){
									console.log(err);
									res.redirect("/myphotos");
								}else{
									if (u){
										let acc = true;
										if (u.access < p.accessLevel){
											acc = false;
										}
										let obj = {
											_id: p._id,
											access: acc
										}
										u.sharedPhotos.push(obj)
										u.save();
										res.render("myphotos", {photos: photos, deleted: false, shared: "info", user: req.user})	
									}else{
										res.render("myphotos", {photos: photos, deleted: false, shared: "error", user: req.user})
									}
								}
							})
						}
					})
				}
			})
		} else {
			res.redirect("/");
		}
	} catch (e) {
		console.log(e);
		res.redirect("/");
	}
})

async function getDeletePage(req, res){
	try {
		if (req.isAuthenticated()){
			let fotos = await getPhotos(req);
			Photo.findOne({_id: req.body.picID}, function(err, pic){
				if (err){
					console.log(err);
					res.redirect("/myphotos")
				}else{
					let ff = pic.link;
					ff = ff.slice(53);
					var pars = {
						Bucket: process.env.BUCKET_NAME,
						Key: "cmpg323_project/" + ff,
					};
					s3.deleteObject(pars, function (err, data) {
						if (err) {
							console.log(err, err.stack);
						}
					});
					Photo.deleteOne({_id: pic._id}, function(err){
						if (err){
							console.log(err);
							res.redirect("/myphotos");
						}else{
							Photo.find({createdBy: req.user._id}, function(err, photos){
								if (err){
									console.log(err);
									res.redirect("/")
								}else{
									if (req.body.site === "my"){
										res.render("myphotos", {photos: photos, deleted: true, shared: "none", user: req.user})
									}else{
										User.findOneAndUpdate({_id: req.user._id}, {$pull: {sharedPhotos: {_id: pic._id}}}, function(err){
											if (err){
												console.log(err);
												res.redirect("/myphotos");
											}else{
												res.render("sharedphotos", {photos: fotos, requested: false, deleted: true, search: false});
											}
										})											
									}
								}
							})
						}
					})
				}
			})
		}else{
			res.redirect("/");
		}
	} catch (e) {
		console.log(e);
		res.redirect("/");
	}
}

app.post("/deletePic", function(req, res){
	getDeletePage(req, res)
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