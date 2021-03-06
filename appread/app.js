var express = require('express');
var path = require('path');
var mongojs = require('mongojs');
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');
var session = require('express-session');
var User = require('./model/user');
const Nexmo = require('nexmo');
var flash = require('connect-flash');
var passport = require('passport');
var bcrypt = require('bcryptjs');
var LocalStrategy = require('passport-local').Strategy;
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);
// set database
var mongo = require('mongodb');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/loginapp');
var db = mongoose.connection;

// init app

// set the views
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');

// BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// set public
app.use(express.static(path.join(__dirname,'public')));

// thiết lập  Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

// middleware được gọi ở từng request, kiểm tra session lấy ra passport.user nếu chưa có thì tạo rỗng.
app.use(passport.initialize());
// lấy thông tin user rồi gắn vào req.user 
app.use(passport.session());

  // Connect Flash
  app.use(flash());

//global vars
app.use(function(req,res,next){
//  res.locals.success_msg = req.flash('success_msg');
  //res.locals.error_msg = req.flash('error_msg');
  //res.locals.error = req.flash('error');
   // res.locals.message = null;
    res.locals.errors = null;
    res.locals.user = req.user || null;
    res.locals.mail = req.mail || null;
    res.locals.phone = req.phone || null;
    
    next();
});





// Express Validator
app.use(expressValidator({
    errorFormatter: function(param, msg, value) {
        var namespace = param.split('.')
        , root    = namespace.shift()
        , formParam = root;
  
      while(namespace.length) {
        formParam += '[' + namespace.shift() + ']';
      }
      return {
        param : formParam,
        msg   : msg,
        value : value
      };
    }
  }));


// register
app.get('/register',function(req,res){
    res.render('register');
    });

//Nexmo
const nexmo = new Nexmo({
    apiKey: '5e555a5e',
    apiSecret: 'i5xyaslqhHZwW00z'
  }, { debug: true });

// khai bao bien de luu thong tin luc dang ki
var code,code1 ;
var name1;
var username1;
var email1;
var password1;
var PhoneNumber1;
app.post('/register', (req, res) => {
    var name = req.body.name;
    var email = req.body.email;
    var username = req.body.username;
    var PhoneNumber = req.body.PhoneNumber;
    var password = req.body.password;
    var password2 = req.body.password2;
name1 = name;
username1 = username;
email1 = email;
password1 = password;
PhoneNumber1 = PhoneNumber;
    // Validation
    req.checkBody('name', 'Name is required').notEmpty();
    req.checkBody('email', 'Email is required').notEmpty();
    req.checkBody('email', 'Email is not valid').isEmail();
    req.checkBody('username', 'Username is required').notEmpty();
    req.checkBody('PhoneNumber','PhoneNumber is required').notEmpty();
    req.checkBody('password', 'Password is required').notEmpty();
    req.checkBody('password2', 'Passwords do not match').equals(req.body.password);
    var errors = req.validationErrors();

    if (errors) {
        res.render('register', {
            errors: errors
        });
    }else {
        //checking for email and username are already taken
        User.findOne({ username: { 
            "$regex": "^" + username + "\\b", "$options": "i"
        }}, function (err, user) {
            User.findOne({ email: { 
                "$regex": "^" + email1 + "\\b", "$options": "i"
        }}, function (err, mail) {
            User.findOne({PhoneNumber: {
                "$regex": "^" + PhoneNumber + "\\b","$options": "i"
            }},function(err,phone){

                if (user || mail ||phone) {
                    res.render('register', {
                        user: user,
                        mail: mail,
                        phone: phone
                    });
                }
                else {
                    var number = req.body.PhoneNumber;
                    var text = parseInt(Math.random()*(9999-1000)+1000);
                    code = text;
                    nexmo.message.sendSms(
                      '841664925036', number, text, { type: 'unicode' },
                      (err, responseData) => {
                        if(err) {
                          console.log(err);
                        } else {
                          const { messages } = responseData;
                          const { ['message-id']: id, ['to']: number, ['error-text']: error  } = messages[0];
                          console.dir(responseData);
                          const data = {id,number,error };
                  
                          // Emit to the client
                          io.emit('smsStatus', {data: data, code: text});
                          res.render("Confirm",{dt: text});
                        }
                      }
                    );
                }
            })
            });
        });
    }
  });


app.post('/codeconfirm', function(req,res){

     var code1 = req.body.code;
    if(code == code1){
        var newUser = new User({
            name: name1,
            email: email1,
            username: username1,
            password: password1,
            PhoneNumber:PhoneNumber1
        });
        User.createUser(newUser, function (err, user) {
            if (err) throw err;
            console.log(user);
        });
        res.render('login');
    }else{
        res.render('Confirm',{dt: code})
    }

})

// forget Password
app.get('/forgetPassword',function(req,res){
    res.render("forgetPassword")
})


var phoneInput;
app.post('/forgetPassword',function(req,res){
 phoneInput = req.body.numberPhone;
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://localhost:27017/";
    MongoClient.connect(url,function(err,db){
        var dbo = db.db("loginapp")
        if(err){
            console.log("connect failed!");
        }else{
            console.log("connected to database");
            dbo.collection('users').find({PhoneNumber:phoneInput}).toArray(function(err,user){
                if(err) throw err;
                else if(user.length > 0){

                    var text = parseInt(Math.random()*(9999-1000)+1000);
                    code1 = text;
                    nexmo.message.sendSms(
                      '841664925036', phoneInput, text, { type: 'unicode' },
                      (err, responseData) => {
                        if(err) {
                          console.log(err);
                        } else {
                          const { messages } = responseData;
                          const { ['message-id']: id, ['to']: number, ['error-text']: error  } = messages[0];
                          console.dir(responseData);
                          const data = {id,number,error };
                  
                          // Emit to the client
                          
                          res.render("resetPassword",{dt: text});
                        }});
                }else{
                    res.redirect('forgetPassword');
                }
               db.close(); 
             });
        }
     
       });
       
    });
      

// resetpassword
app.post('/resetPassword',function(req,res){
    var resetPassword = req.body.resetPassword;
    var resetPassword2 = req.body.resetPassword2;
    var codeReset = req.body.codeReset;

    // check errors
    req.checkBody('resetPassword','Nhập mật khẩu mới!').notEmpty();
    req.checkBody('resetPassword2','Nhập lại mật khẩu yêu cầu!').notEmpty();
    req.checkBody('resetPassword2','Mật khẩu không khớp!').equals(req.body.resetPassword);
    req.checkBody('codeReset','Nhập mã code xác nhận!').notEmpty();
      //code1.toString();
    req.checkBody('codeReset','Mã xác nhận không đúng!').equals(code1.toString());
    console.log(code1);
    var errors = req.validationErrors();

    if(errors){
        res.render('resetPassword',{
            errors:errors
        })
    }else{
        var MongoClient = require('mongodb').MongoClient;
        var url = "mongodb://127.0.0.1:27017/";

        MongoClient.connect(url, function(err, db) {
         if (err) throw err;
         var dbo = db.db("loginapp");
        var password = {PhoneNumber: phoneInput}
        
            // ma hoa mat khau va cap nhat mat khau moi trong database
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(resetPassword, salt, function(err, hash) {
            var newpass = { $set: {password: hash } };
            dbo.collection("users").updateOne(password, newpass, function(err, result) {
            if (err) throw err;
            console.log("Cập nhật mật khẩu thành công");
            res.render('login');
            db.close();
        });
   });      
   });
  });
}    
});


// Hàm tìm kiếm
function search_name(X,Y){
    X = X.split(" ");
    Y = Y.split(" ");
    var lenX = X.length;
    var lenY = Y.length;
    var a = new Array(lenX+1);
    for(var i =0 ;i<lenX+1;i++){
        a[i] = new Array(lenY+1)
    }
    
    for(var i = lenX;i >= 0;i-- )
        a[i][lenY] = 0;
    
    for(var j = lenY;j >= 0;j-- ){
        a[lenX][j] = 0;
    }
    for(var i= lenX-1; i>=0; i--){
        for(var j=lenY-1;j>=0;j--){
            if(X[i]==Y[j]) a[i][j] = a[i+1][j+1] + 1;
            else a[i][j] = a[i][j+1]>a[i+1][j]?a[i][j+1]:a[i+1][j];
        }
    }
    return a[0][0]
}

app.post("/search", function(req,res){
    var key = req.body.product_name;
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://localhost:27017/";
    var data = new Array();
    var data_num = new Array();
MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  var dbo = db.db("mydb");
  var re = {name: key};
  dbo.collection("SanPhamMayTinh").find().toArray( function(err, result) {
    if (err) throw err;
    for(var i = 0;i<result.length;i++){
    if(search_name(result[i].name, key)>0){
        data.push(result[i]);
        data_num.push(search_name(result[i].name, key));
    }
}
     if(data.length!=0){
        for(var i = 0; i<data.length-1;i++){
           var k2;
           var max;
        for(var j=i+1;j<data.length;j++)
        if(data_num[i]<data_num[j]){
            var k1;
            k1=data_num[i];data_num[i]=data_num[j];data_num[j]=k1;
          max = j;
        }
        k2=data[i];data[i]=data[max];data[max]=k2;
    }
}
    res.render("searchpage",{kq: data})
    db.close();
  });
});
})
//khi login thi chay middleware va goi den cai nay
passport.use(new LocalStrategy(
    function (username, password, done) {
        User.getUserByUsername(username, function (err, user) {
            if (err) throw err;
            if (!user) {
                return done(null, false, { message: 'Unknown User' });
            }

            User.comparePassword(password, user.password, function (err, isMatch) {
                if (err) throw err;
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Invalid password' });
                }
            });
        });
    }));
// ham duoc goi khi xac thực thành công để lưu thông tin user vào session
passport.serializeUser(function (user, done) {
    done(null, user.id);
});
// giuos ta lấy dữ liệu user dựa vào thông tin lưu trên session và gắn vào req.user 
passport.deserializeUser(function (id, done) {
    User.getUserById(id, function (err, user) {
        done(err, user);
    });
});

// login
app.get('/login',function(req,res){
    res.render('login');
    });
app.get('/themsanpham',function(req,res){
    res.render('themsanpham');
});
app.post('/login',
    passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login', failureFlash: true }),
    function (req, res) {
        res.redirect('/',function(){
            alert("ban da dang nhap thanh cong");
        });
        
    });

    app.get('/logout', function (req, res) {
    req.logout();

    req.flash('success_msg', 'You are logged out');

    res.redirect('/');
});

// get follow list
app.get('/followList',checkAuthentication,function(req,res){
    res.render('followList');
});
function checkAuthentication(req,res,next){
    if(req.isAuthenticated()){
        //req.isAuthenticated() will return true if user is logged in
        next();
    } else{
        res.send("you have to login first");
    }
}


var mongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/mydb";
io.on("connection",function(socket){
console.log("ok");
socket.on("gui-comment",function(data){
    io.sockets.emit("gui-comment",data);
})
socket.on("list-sp",function(){
    mongoClient.connect(url, function(err, db) {
                if (err) throw err;
                var dbo=db.db("mydb");
                dbo.collection("SanPhamMayTinh").find().toArray(function(err, result1) {
                    if (err) throw err;
                    dbo.collection("SanPhamChuot").find().toArray(function(err, result2){
                        if(err) throw err;
                        db.close();
                        socket.emit("san-pham",result1)
                       })
                  });
              });
         });
});
app.get("/",function(req,res){
    mongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo=db.db("mydb");
        dbo.collection("SanPhamMayTinh").find().toArray(function(err, result1) {
            if (err) throw err;
            dbo.collection("SanPhamChuot").find().toArray(function(err, result2){
                if(err) throw err;
                db.close();
                res.render("homepage",{
                    "MayTinh": result1,
                    "Chuot":result2,
                    "num1" : result1.length,
                    "num2" : result2.length,
                });
        });   
  
    });
});

});
app.get("/:id",function(req,res){
    var id = req.params.id;
     id = new require('mongodb').ObjectID;
    var query = {_id: id};
    mongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("mydb");
        dbo.collection("SanPhamMayTinh").findOne(query,function(err, result) {
        if (result==null){
            dbo.collection("SanPhamChuot").findOne(query,function(err, result){
                res.render('template',{info: result, ten : "Chuot"});
            })
        }else{
            res.render('template',{info: result, ten: "MayTinh"}); 
        }
          db.close();
        
        });
});
});

// change password
app.get('/changePassword/1',function(req,res){
    res.render("changePassword");
})

app.post("/changePassword",function(req,res){

    var oldPassword = req.body.oldPassword;
    var newPassword = req.body.newPassword;
    var newPassword2 = req.body.newPassword2;
    
    // truy cap de lay mat khau cu
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb://localhost:27017";
    MongoClient.connect(url,function(err,foundUser){
        if(err) throw err;
        var dbo = foundUser.db("loginapp");
        dbo.collection("users").findOne({username:"hao"},function(err,user){
            if(err) throw err;
            if(user){

                User.comparePassword(oldPassword,user.password,function(err,isMatch){
            if(err) throw err;
            if(isMatch){
                            // check validator
            //req.checkBody('oldPassword','Nhập mật khẩu cũ').notEmpty();
            req.checkBody('newPassword','Nhập mật khẩu mới').notEmpty();
            req.checkBody('newPassword2','Nhập lại mật khẩu mới').notEmpty();
            req.checkBody('newPassword2','Xác nhận mật khẩu không khớp').equals(req.body.newPassword);

    // check errors
    var errors = req.validationErrors();
        if(errors){
        res.render("changePassword",{errors:errors});
        }else{

        var newPass = {username:"hao"};
        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(newPassword, salt, function(err, hash) {
                var newpass = { $set: {password: hash } };
                dbo.collection("users").updateOne(newPass, newpass, function(err, result) {
                if (err) throw err;
                console.log("Cập nhật mật khẩu thành công");
                res.render('login');
                db.close();
            });
       });      
       });
    }
    }else{res.render("changePassword"); }})
 }else{ res.render("changePassword");}
 })
}); 
})


server.listen(8084,function(){
    console.log('server started at port 8084');
});

//pop-up-chat
//chua check log in
io.on("connection",function(socket){
    socket.on("Client-send-messages",function(data){
        socket.emit("Server-send-your-message",data)
        socket.broadcast.emit("Client-ask",data)
    })
    socket.on("Admin-send-messages",function(data){
        socket.emit("Server-send-admin-message",data)
    })
})

