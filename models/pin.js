var mongoose = require("mongoose");

var pinSchema = mongoose.Schema({
  owner: { type: String, required: true},
  owner_name: { type: String, required: true},
  url: { type: String, required: true} ,
  title: { type: String, required: true},
  desc: { type: String, required: false},
  favs: { type : Array , "default" : [] }
});


var Pin = mongoose.model("Pin", pinSchema);
module.exports = Pin;