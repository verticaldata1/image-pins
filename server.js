var express = require('express');
var path = require("path");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var session = require("express-session");
var passport = require("passport");
var flash = require("connect-flash");
var setUpPassport = require("./config/passport");
var fetch = require("node-fetch");
var Pin = require("./models/pin.js");
var User = require("./models/user.js");
var authRouter = require("./routes/authentication.js");
var app = express();

app.set("views", path.resolve(__dirname, "views"));
app.set("view engine", "ejs");

mongoose.connect("mongodb://vd1:"+process.env.DB_PASSWORD+"@ds125068.mlab.com:25068/image-pins");
setUpPassport();

/* middleware: */
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(session ({
  secret : process.env.SECRET,
  resave: true,
  saveUninitialized: true
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(function(req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.errors = req.flash("error");
  next();
});
app.use(authRouter);

/* routes */
app.get("/", function (req, res, next) {
  console.log("got index req");
  Pin.find({}, function(err, pins) {
    if(err) { return next("Database error"); }
    if(pins) {
      res.locals.allPins = pins;
    }
    res.render("index");
  });
  
});

app.get("/viewPin/:pin_id", function(req, res, next) {
  var pin_id = req.params.pin_id;
  
  Pin.findOne({_id : pin_id}, function(err, pin) {
    if(err) { next("database error"); }
    if(!pin) { next("Pin lookup failed"); }
    
    res.locals.pin = pin;
    res.render("view_pin");
  });  
});

app.get("/profile/:user_id", function(req, res, next) {
  var user_id = req.params.user_id;
  
  User.findOne({"facebook.id" : user_id}, function(err, user) {
    if(err) { next("database error"); }
    if(!user) { next("User lookup failed"); }
    
    res.locals.displayName = user.facebook.name;
    res.locals.profileId = user_id;
    Pin.find({owner: user_id}, function(err, pins) {
      if(err) { return next("Database error"); }
      if(pins) {
        res.locals.allPins = pins;
      }
      res.render("profile");
    });
  });  
});

app.post("/deletePin", isAuthenticated, function(req, res, next) {
  var pin_id = req.body.pin_id;
  var user_id = req.user.facebook.id;
  
  Pin.findOne({_id : pin_id}, function(err, pin) {
    if(err) { next("database error"); }
    if(!pin) { next("Pin lookup failed"); }
    if(pin.owner != user_id) {
      res.status(200).send("error");
    }
    else {
      Pin.findOne({_id : pin_id}).remove().exec(); 
      res.status(200).send("no error");
    }
  });
  
});

app.post("/addFav", isAuthenticated, function(req, res, next) {
  var pin_id = req.body.pin_id;
  var user_id = req.user.facebook.id;
  console.log("Got addFav req="+pin_id+" and user="+req.user.facebook.name);
  
  Pin.findOne({_id : pin_id}, function(err, pin) {
    if(err) { next("database error"); }
    if(!pin) { next("Pin lookup failed"); }
    
    if(pin.favs.indexOf(user_id) !== -1) {
      res.status(200).send("already faved");
    }
    else {
      pin.favs.push(user_id);
      var numFav = pin.favs.length;
      pin.save(function(err) {
        if(err) { return next("Updating pin favs failed"); }     
        console.log("updated pin favs. Now has="+numFav);
        res.status(200).send(numFav.toString());
      });
    }
  });  
});

app.get("/myFavs/:user_id", isAuthenticated, function(req, res, next) {
  var user_id = req.params.user_id;
  
  if(req.user.facebook.id != user_id) {
    next("can only view your own favorites!"); 
  }
  Pin.find({favs : user_id}, function(err, pins) {
    if(err) { next("database error"); }
    res.locals.allPins = pins;
    res.render("view_favs");
  });  
});

app.post("/removeFav", isAuthenticated, function(req, res, next) {
  var pin_id = req.body.pin_id;
  var user_id = req.user.facebook.id;
  
  Pin.findOne({_id : pin_id}, function(err, pin) {
    if(err) { next("database error"); }
    if(!pin) { next("Pin lookup failed"); }
    
    var idx = pin.favs.indexOf(user_id);
    if(idx === -1) {
      res.status(200).send("error");
    }
    else {
      pin.favs.splice(idx, 1);
      pin.save(function(err) {
        if(err) {
          next(err); 
        }
        else {
          res.status(200).send("no error");
        }
      });
    }
  });  
});

app.get("/addPin", isAuthenticated, function (req, res, next) {
  res.render("add_pin");
});

app.post("/addPin", isAuthenticated, function (req, res, next) {
  var title = req.body.title;
  var url = req.body.url;
  var desc = req.body.desc;
  var owner = req.user.facebook.id;
  var owner_name = req.user.facebook.name;
  
  var newPin = new Pin({
    owner: owner,
    owner_name: owner_name,
    title: title,
    desc: desc,
    url: url
  });
  newPin.save(function(err) {
    if(err) {
      next(err); 
    }
    else {
      res.redirect("/profile/"+owner);  
    }
  });     
  
});

/* authentication */
function isAuthenticated(req,res,next) {
  if(req.isAuthenticated()){
    next();
  }
  else {
    req.flash("error", "Please log in first");
    res.redirect("/");
  }
}


app.use(function(err, req, res, next) {
  req.flash("error", err);
  res.redirect("/");
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
