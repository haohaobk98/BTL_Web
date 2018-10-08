var express = require('express');
var path = require('path');
var mongojs = require('mongojs');
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');
var session = require('express-session');
var User = require('./model/user');

var flash = require('connect-flash');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
// set database
var mongo = require('mongodb');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/loginapp');
var db = mongoose.connection;

// init app
var app = express();

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
//	res.locals.success_msg = req.flash('success_msg');
  //res.locals.error_msg = req.flash('error_msg');
  //res.locals.error = req.flash('error');
   // res.locals.message = null;
	res.locals.errors = null;
	res.locals.user = req.user || null;
	res.locals.mail = req.mail || null;
	
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
  var server = require("http").Server(app);
  var io = require("socket.io")(server);
// homepage route
// app.get('/',function(req,res){
// res.render('homepage');
// });

// add new books
app.get('/book/add',function(req,res){
res.render('add_book');
});

// register
app.get('/register',function(req,res){
    res.render('register');
    });
// Register User
app.post('/register', function (req, res) {
	var name = req.body.name;
	var email = req.body.email;
	var username = req.body.username;
	var PhoneNumber = req.body.PhoneNumber;
	var password = req.body.password;
	var password2 = req.body.password2;

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
				"$regex": "^" + email + "\\b", "$options": "i"
		}}, function (err, mail) {
				if (user || mail) {
					res.render('register', {
						user: user,
						mail: mail
					});
				}
				else {
					var newUser = new User({
						name: name,
						email: email,
						username: username,
						password: password
					});
					User.createUser(newUser, function (err, user) {
						if (err) throw err;
						console.log(user);
					});
         	req.flash('success_msg', 'You are registered and can now login');
					res.redirect('/login');
				}
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
    //var a = new Array(new Array(lenX+1),new Array(lenY+1));
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
function swap(x,y){
    var k;
    k=x;
    x=y;
    y=k;
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
            // swap(data_num[i],data_num[j]);
            // swap(data[i],data[j]);
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
// ham duoc goi khi xac thực thành công để lưu thông tin user vào sesstion
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
     id = new require('mongodb').ObjectID(id);
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


server.listen(8082,function(){
    console.log('server started at port 8082');
});