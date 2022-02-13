const express = require("express")
const app = express()
const dotenv = require ('dotenv').config()

const bodyParser = require("body-parser")
const ejs = require("ejs")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const randToken = require("rand-token")
const nodemailer = require("nodemailer")

const User = require("./models/user")   // USER SCHEMA
const Reset = require("./models/reset")   // RESET SCHEMA
const Ingredient = require("./models/ingredient")   // INGREDIENT SCHEMA
const Schedule = require("./models/schedule")   // SCHEDULE SCHEMA
const Receipe = require("./models/receipe")   // RECEIPE SCHEMA
const Favourite = require("./models/favourite")   // FAVOURITE SCHEMAS
app.use(passport.initialize())                          // initialise passport
app.use(passport.session())                             // cree le lien entre la session et passport

mongoose.connect("mongodb+srv://basco:test@cluster0.sqrhj.mongodb.net/cooking?retryWrites=true&w=majority",
    { useNewUrlParser : true,
      useUnifiedTopology : true
    })

passport.use(User.createStrategy());                   //PASSPORT
passport.serializeUser(User.serializeUser());           //LOCAL
passport.deserializeUser(User.deserializeUser());       //MONGOOSE

app.set("view engine", "ejs")               // COMMANDE EJS

app.use(express.static("public"))           //   PUBLIC FOLDER

app.use(bodyParser.urlencoded({extended:false})) // COMMANDE BODYPARSER


const methodOverride = require("method-override")
const user = require("./models/user.js")
const { getMaxListeners } = require("./models/user.js")
const { info } = require("npmlog")
const port = 3000
const flash = require("connect-flash")
app.use(flash())                    //initialise flash
app.use(methodOverride('_method')) //initialise override (1 des 2 methodes CF google)

app.use(function(req,res,next){         //programmation flash
    res.locals.currentUser = req.user
    res.locals.error = req.flash("error")      
    res.locals.success = req.flash("success")
    next()
})    

app.get("/",function(req,res){
    res.render("index")
})

app.get("/signup",function(req,res){
    res.render("signup")
})

app.post("/signup",function(req,res){   
    const newUser = new User({ username: req.body.username })
        User.register(newUser,req.body.password,function(err,user){
            if (err){
                console.log(err)
                res.render("signup")
            }else{
                passport.authenticate("local")(req,res,function(){
                    res.redirect("signup")
                })
            }
        })
})

app.get("/login",function(req,res){
    res.render("login")
})

app.post("/login",function(req,res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    })

    req.login(user,function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res,function(){          //LA SESSION DEBUTE
                req.flash("success", "Congratulations, you are logged in !")
                res.redirect("/dashboard")
            })
        }
    })
})

app.get("/dashboard",isLoggedIn, function(req,res){
    res.render("dashboard")
})

app.get("/logout",function(req,res){
    req.logout()                                        //LA SESSION PREND FIN
    req.flash("success","You are now logged out, see you soon!")
    res.redirect("/login")
})

app.get("/forgot",function (req,res){
    res.render("forgot")
})

app.post("/forgot",function (req,res){
    User.findOne({username : req.body.username}, function(err,userFound){
        if(err){
            console.log(err)
            res.redirect("/login")
        }else{
            const token = randToken.generate(16)
            Reset.create({
                username: userFound.username,
                resetPasswordToken: token,
                resetPasswordExpires: Date.now() + 900000
            })
            const transporter = nodemailer.createTransport({
                service : 'gmail',
                auth: {
                    user: 'martinez.xabi64@gmail.com',
                    pass: process.env.PWD
                }
            })
            const mailOptions = {
                from : 'martinez.xabi64@gmail.com',
                to : req.body.username,
                subject: 'Link to reset your password',
                text: 'Clik here to reset your password : http://localhost:3000/reset/' + token
            }
            console.log("Le mail est prét a etre envoyer")

            transporter.sendMail(mailOptions,function(err,response){
                if(err){
                    console.log(err)
                }else{
                    req.flash("success","Your email has been sent successfully!")
                    res.redirect("login")
                }
            })
        }
    })
})

app.get("/reset/:token",function(req,res){
    Reset.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: {$gt : Date.now()}
    },function(err,obj){
        if(err){
            console.log("Token expired")
            req.flash("error","Token expired!")
            res.redirect("/login")
        }else{
            res.render("reset", {token: req.params.token})
        }
    })
})

app.post("/reset/:token",function(req,res){
    Reset.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt : Date.now() }
    },function(err,obj){
        if(err){
            console.log("Token expired")
            res.redirect("/login")
        }else{
            if(req.body.password==req.body.password2){
                User.findOne({username : obj.username},function(err,user){
                    if(err){
                        console.log(err);
                    }else{
                        user.setPassword(req.body.password, function(err){
                            if(err){
                                console.log(err);
                            }else{
                            user.save()
                            const updatedReset = {
                                resetPasswordToken : null,
                                resetPasswordExpires: null
                            }
                            Reset.findOneAndUpdate({resetPasswordToken : req.params.token},updatedReset,function(err,obj1){
                                if(err){
                                    console.log(err);
                                }else{
                                    res.redirect("/login")
                                }
                            })
                        }
                    })
                    }
                })
            }
        }
    })
})

app.get("/dashboard/myreceipes",isLoggedIn,function(req,res){
    Receipe.find({ user : req.user.id },function(err,receipe){
        if(err){
            console.log(err);
        }else{
            res.render("receipe", {receipe : receipe})
        }
    })
})

app.get("/dashboard/newreceipe",isLoggedIn,function(req,res){
    res.render("newreceipe")
})

app.post("/dashboard/newreceipe",isLoggedIn,function(req,res){
    const newReceipe = {
        name : req.body.receipe,
        image : req.body.logo,
        user : req.user.id
    }
    Receipe.create(newReceipe,function(err,newReceipe){
        if(err){
            console.log(err);
        }else{
            req.flash("success","New receipe added!")
            res.redirect("/dashboard/myreceipes")
        }
    })
})

app.get("/dashboard/myreceipes/:id",isLoggedIn,function(req,res){
    Receipe.findOne({user:req.user.id,_id:req.params.id},function(err,receipeFound){
        if(err){
            console.log(err)
        }else{
            Ingredient.find({
                user:req.user.id,
                receipe:req.params.id
            },function(err,ingredientFound){
                if(err){
                    console.log(err)
                }else{
                    res.render("ingredients",{
                    ingredient : ingredientFound,
                    receipe : receipeFound
                    })
                }
            })
        }
    })
})

app.post("/dashboard/myreceipes/:id",isLoggedIn,function(req,res){
    const newingredient= {
        name: req.body.name,
        bestDish: req.body.dish,
        user: req.user.id,
        quantity: req.body.quantity,
        receipe: req.params.id
    }
    Ingredient.create(newingredient,function(err,newingredient){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Your ingredient has been added!")
            res.redirect("/dashboard/myreceipes/"+req.params.id)
        }
    })
})

app.delete("/dashboard/myreceipes/:id",isLoggedIn,function(req,res){
    Receipe.deleteOne({_id: req.params.id},function(err){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Your receipe has been deleted!")
            res.redirect("/dashboard/myreceipes")
        }
    })
})

app.get("/dashboard/myreceipes/:id/newingredient",isLoggedIn,function(req,res){
    Receipe.findById({_id: req.params.id},function(err,found){
        if (err){
            console.log(err);
        }else{
            res.render("newingredient",{receipe: found})
        }
    })
})

app.delete("/dashboard/myreceipes/:id/:ingredientid",isLoggedIn,function(req,res){
    Ingredient.deleteOne({_id: req.params.ingredientid},function(err){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Your ingredient has been deleted!")
            res.redirect("/dashboard/myreceipes/"+req.params.id)
        }
    })
})

app.put("/dashboard/myreceipes/:id/:ingredientid",isLoggedIn,function(req,res){
    const ingredient_updated = {
        name : req.body.name,
        bestDish: req.body.dish,
        user : req.user.id,
        quantity : req.body.quantity,
        receipe : req.params.id
    }
    Ingredient.findByIdAndUpdate({_id: req.params.ingredientid},ingredient_updated,function(err,updatedIngredient){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Successfully updated your ingredient!")
            res.redirect("/dashboard/myreceipes/"+ req.params.id)
        }
    })
})

app.post("/dashboard/myreceipes/:id/:ingredientid/edit",isLoggedIn,function(req,res){
    Receipe.findOne({user:req.user.id,_id:req.params.id},function(err,receipeFound){
        if(err){
            console.log(err);
        }else{
            Ingredient.findOne({
                _id : req.params.ingredientid,
                receipe: req.params.id
            },function(err,ingredientFound){
                if(err){
                    console.log(err);
                }else{
                    res.render("edit",{
                        ingredient: ingredientFound,
                        receipe: receipeFound
                    })
                }
            })
        }
    })
})

app.get("/dashboard/favourites",isLoggedIn,function(req,res){
    Favourite.find({user: req.user.id},function(err,favourite){
        if(err){
            console.log(err);
        }else{
            res.render("favourites",{favourite:favourite})
        }
    })
})

app.get("/dashboard/favourites/newfavourite",isLoggedIn,function(req,res){
    res.render("newfavourite")
})

app.post("/dashboard/favourites",isLoggedIn,function(req,res){
    const newFavourite = {
        image: req.body.image,
        title: req.body.title,
        description: req.body.description,
        user: req.user.id
    }
    Favourite.create(newFavourite,function(err,newFavourite){
        if(err){
            console.log(err);
        }else{
            req.flash("sucess","You just added a new fav!")
            res.redirect("/dashboard/favourites")
        }
    })
})

app.delete("/dashboard/favourites/:id",isLoggedIn,function(req,res){
    Favourite.deleteOne({_id: req.params.id},function(err){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Your Fav has been deleted!")
            res.redirect("/dashboard/favourites")
        }
    })
})

app.get("/dashboard/schedule",isLoggedIn,function(req,res){
    Schedule.find({user:req.user.id},function(err,schedule){
        if(err){
            console.log(err);
        }else{
            res.render("schedule",{schedule:schedule})
        }
    })
})

app.get("/dashboard/schedule/newschedule",isLoggedIn,function(req,res){
    res.render("newSchedule")
})

app.post("/dashboard/schedule",isLoggedIn,function(req,res){
    const newSchedule= {
        ReceipeName : req.body.receipename,
        scheduleDate : req.body.scheduleDate,
        user : req.user.id,
        time : req.body.time,
    }
    Schedule.create(newSchedule,function(err,newSchedule){
        if(err){
            console.log(err);
        }else{
            req.flash("success","You just added a new schedule!")
            res.redirect("/dashboard/schedule")
        }
    })
})

app.delete("/dashboard/schedule/:id",isLoggedIn,function(req,res){
    Schedule.deleteOne({_id: req.params.id},function(err){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Your schedule has been deleted!")
            res.redirect("/dashboard/schedule")
        }
    })
})

app.get("/about",function(req,res){
    res.render("About")
})

function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next()
    }else{
        req.flash("error","Please login first!")
        res.redirect("/login")
    }
}

app.listen(port,function(){console.log(`Le serveur fonctionne correctement sur le port ${port}.`)});