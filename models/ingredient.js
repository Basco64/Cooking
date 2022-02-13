const mongoose = require("mongoose")

const ingredientSchema = new mongoose.Schema({
    name : String,
    bestDish: String,
    user : String,
    quantity : String,
    receipe : String,
    date : {
        type : Date,
        default : Date.now()
    }
})

module.exports = mongoose.model("Ingredient", ingredientSchema)