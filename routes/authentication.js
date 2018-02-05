var express = require("express");
var passport = require("passport");

var rt = express.Router();



// route for facebook authentication and login
rt.get('/auth/facebook', passport.authenticate('facebook', { 
  scope : ['public_profile', 'email']
}));

// handle the callback after facebook has authenticated the user
rt.get('/auth/facebook/callback', passport.authenticate('facebook', {
    successRedirect : "/",
    failureRedirect : '/'
}));

// route for logging out
rt.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

function isAuthenticated(req,res,next) {
  if(req.isAuthenticated()){
    next();
  }
  else {
    req.flash("error", "Please log in first");
    res.redirect("/");
  }
}

module.exports = rt;