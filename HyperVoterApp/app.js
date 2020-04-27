'use strict';

var express = require('express');
var path = require('path');
var session = require('express-session');
var bodyParser = require('body-parser');

const {FileSystemWallet, Gateway} = require('fabric-network');
const fs = require('fs');

const ccpPath = path.resolve(__dirname, '..', '..', 'basic-network', 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

var app = express();
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname + '/public/index.html'));
});

app.get('/EC-dashboard/index.html', function(request, response) {
	response.sendFile(path.join(__dirname + '/public/EC-dashboard/index.html'));
});

app.get('/EC-dashboard/ec-dashboard.html', function(request, response) {
	response.sendFile(path.join(__dirname + '/public/EC-dashboard/ec-dashboard.html'));
});

app.get('/EC-dashboard/ec-registration.html', function(request, response) {
	response.sendFile(path.join(__dirname + '/public/EC-dashboard/ec-registration.html'));
});

app.post('EC-reg', function(request, response) {
    var username = request.body.username;
    var password = request.body.password;
    if (username && password) {
        if (username == 1) {
            if (password == 54321) {
                request.session.loggedin = true;
                request.session.username = username;
            } else {
                response.send('Incorrect EC username!');
            }
        } else {
            response.send('Incorrect EC password!');
        }
    } else {
        response.send('Please enter Username and Password!');
    }

    if (request.session.loggedin) {
        async function registerEC() {
            EC_ID = request.session.username;
            try{
                // Create a new file system based wallet for managing identities.
                const walletPath = path.join(process.cwd(), 'wallet');
                const wallet = new FileSystemWallet(walletPath);
                console.log(`Wallet path: ${walletPath}`);    
                
                // Check to see if we've already enrolled the EC.
                const EC_Exists = await wallet.exists(EC_ID);
                if (EC_Exists) {
                    console.log(`An identity for the EC already exists in the wallet`);
                    return;
                }

                // Check to see if we've already enrolled the admin user.
                const adminExists = await wallet.exists('admin');
                if (!adminExists) {
                    console.log('An identity for the admin user "admin" does not exist in the wallet');
                    console.log('Run the enrollAdmin.js application before retrying');
                    return;
                }

                // Create a new gateway for connecting to our peer node.
                const gateway = new Gateway();
                await gateway.connect(ccp, {wallet, identity: 'admin', discovery: {enabled: false}});

                // Get the CA client object from the gateway for interacting with the CA.
                const ca = gateway.getClient().getCertificateAuthority();
                const adminIdentity = gateway.getCurrentIdentity();

                // Register the user, enroll the user, and import the new identity into the wallet.
                const secret = await ca.register({
                    affiliation: 'org1.department1',
                    enrollmentID: EC_ID,
                    role: 'client'
                }, adminIdentity);

                const enrollment = await ca.enroll({enrollmentID: EC_ID, enrollmentSecret: secret});
                const userIdentity = X509WalletMixin.createIdentity('Org1MSP', enrollment.certificate, enrollment.key.toBytes());
                wallet.import(EC_ID, userIdentity);
                console.log(`Successfully registered and enrolled EC with enrollment ID 1 and imported it into the wallet`);

            } catch (error) {
                console.error(`Failed to register EC: ${error}`);
                process.exit(1);
                response.end();
            }
        }
    }
    response.redirect('/EC-dashboard/ec-dashboard.html');
});








var server = app.listen(3375, function () {
  var host = 'localhost'
  var port = server.address().port
  
  console.log("Example app listening at http://%s:%s", host, port)
})









// //var createError = require('http-errors');
// var express = require('express');
// var path = require('path');
// //var cookieParser = require('cookie-parser');
// //var logger = require('morgan');

// const {FileSystemWallet, Gateway} = require('fabric-network');
// const fs = require('fs');
// //const path = require('path');

// let rawdata_voters = fs.readFileSync('voters.json');
// let voters_list = JSON.parse(rawdata_voters);
// const ccpPath = path.resolve(__dirname, '..', '..', 'basic-network', 'connection.json');
// const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
// const ccp = JSON.parse(ccpJSON);

// var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/users');

// var app = express();
// app.use(session({
// 	secret: 'secret',
// 	resave: true,
// 	saveUninitialized: true
// }));
// app.use(bodyParser.urlencoded({extended : true}));
// app.use(bodyParser.json());

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

// app.use(logger('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', indexRouter);
// app.use('/users', usersRouter);

// // catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });

// // error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });

// module.exports = app;
