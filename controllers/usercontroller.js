const UserModel = require('../models/user')
const cloudinary = require('cloudinary')
const bcrypt = require("bcrypt")
const jwt = require('jsonwebtoken')
const nodemailer  = require('nodemailer')

cloudinary.config({
    cloud_name: 'dyblatmzo',
    api_key: '757875579268529',
    api_secret: 'OaD3lbfPxv_CrCd-pcIFiOtlDKw' // Click 'View Credentials' below to copy your API secret
});


class UserController {
    static Userinsert = async (req, res) => {
        try {
            // console.log(req.body)
            // console.log(req.files.image)

            const { name, email, password, cpassword, phone, address } = req.body
            const user = await UserModel.findOne({ email: email })
            if (user) {
                req.flash('error', 'email allready exit')
                res.redirect('/signin')
            } else {
                if (password == cpassword) {
                    const file = req.files.image
                    const uploadImage = await cloudinary.uploader.upload
                        (
                            file.tempFilePath, { timeout: 120000 }, {
                            folder: "userimage"
                        })
                    const hashPassword = await bcrypt.hash(password, 10)
                    const result = new UserModel({
                        name: name,
                        email: email,
                        password: hashPassword,
                        phone: phone,
                        address: address,
                        image: {
                            public_id: uploadImage.public_id,
                            url: uploadImage.secure_url
                        }
                    })
                   const userdata = await result.save();

                   //console.log(userdata)
                   if (userdata){
                    const token = jwt.sign({ID:userdata._id},"pnidnfmsfhd7327632nsx7");
                    //console.log(token)
                    res.cookie("token",token);
                    this.sendVerifymail(name,email,userdata._id);
                    //to redirect to login page
                    req.flash(
                        "success",
                        "your Registration has been successfully.please verify your email."
                    );
                    res.redirect("/signin");
                   }else{
                    req.flash("error","Not Register.");
                    res.redirect("/signin");
                   }
                } else {
                    req.flash('error', 'password and confirm password not match')
                    res.redirect('./signin')
                }
            }

        } catch (error) {
            console.log(error)
        }
    }

    static verifylogin = async (req, res) => {
        try {
            // console.log(req.body)
            const { email, password,} = req.body
            const user = await UserModel.findOne({ email: email })
            //console.log(user)
            if (user != null) {
                const isMatch = await bcrypt.compare(password, user.password);
                if (isMatch) {
                    //admin login
                    if (user.role == "admin") {
                        let token = jwt.sign({ ID: user.id }, 'pnidnfmsfhd7327632nsx7');
                        // console.log(token)
                        res.cookie('token', token)

                        res.redirect('/admin/dashboard')

                    }
                    if (user.role == "user" && user.is_verified==1 && user.status == "approved") {
                        let token = jwt.sign({ ID: user.id }, 'pnidnfmsfhd7327632nsx7');
                        // console.log(token)
                        res.cookie('token', token)
                        res.redirect('/admin/dashboard')

                    } else {
                        req.flash("error", "Not Approved Plz Wait.");
                        res.redirect("/login");

                    }

                } else {
                    req.flash("error", "email or password is not valid.");
                    res.redirect("/login");
                }
            } else {
                req.flash("error", "you are not a registered user.");
                req.redirect("/");
            }
        } catch (error) {

        }
    }

    static display = async (req, res) => {
        try {
            const { name, image ,role } = req.userdata
            const users = await UserModel.find({role:"user"})
            res.render('admin/user/display', { u: users, i: image, n: name ,role:role })


        } catch (error) {
            console.log(error)
        }
    }

    static updateStatus = async (req, res) => {
        try {
            const {name,email,status} = req.body
            const users = await UserModel.findByIdAndUpdate(req.params.id,{
                status:status
            })
            this.sendEmail(name,email,status)
            res.redirect('/users')


        } catch (error) {
            console.log(error)
        }
    }

    static userView = async (req, res) => {
        try {
            const {name,image,role} = req.userdata
            const id = req.params.id
            //console.log(id)
            const display = await UserModel.findById(id)
            //  console.log(category)
            res.render('admin/user/view', {n:name,i:image, d:display,role:role })
        } catch (error) {
            console.log(error)
        }
    }
    static userDelete = async (req, res) => {
        try {
            await UserModel.findByIdAndDelete(req.params.id)
            req.flash('success', 'blog Delete Success')
            res.redirect('/updateStatus')
        } catch (error) {
            console.log(error)
        }

    }
    static sandEmail = async(name,email,status)=>{
        console.log(name,email,status)

        let transporter = await nodemailer.createTransport({
            host:"smtp.gmail.com",
            port:587,

            auth:{
                user:"patsariya.abhi@gmail.com",
                pass:"mjisqrzzblyenhje"
            },
        });
        let info = await transporter.sendMail({
            from: "test@gmail.com", // sender address
            to: email, // list of receivers
            subject: `login ${status}`, // Subject line
            text: "heelo", // plain text body
            html: `<b>${name}</b> login ${status}`,
        });
    };


    static sendVerifymail = async (name, email,user_id) => {
        console.log(name,email,user_id)
      
        let transporter = await nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
    
          auth: {
            user: "patsariya.abhi@gmail.com",
            pass: "mjisqrzzblyenhje",
          },
        });
        let info = await transporter.sendMail({
          from: "test@gmail.com", // sender address
          to: email, // list of receivers
          subject: "For verification mail", // Subject line
          text: "heelo", // plain text body
          html: 
          "<p>Hii" +
          name +
          'please click here to<a href ="http://localhost:3000/verify?id='+ 
          user_id +
        '">verify</a>your mail</p>.',
            });
        //console.log(info);
      };

    static verifymail=async(req,res)=>{
        try{
            const updateinfo = await UserModel.findByIdAndUpdate(req.query.id, {
                is_verified:1,
            });
            if(updateinfo)
            {
                res.redirect("/login");
            }
        }catch(error){
            console.log(error);
        }
    };

}
module.exports = UserController
