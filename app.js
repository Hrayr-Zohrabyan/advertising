import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import mongoose from 'mongoose';
import AuthenticationHelper from './helpers/AuthenticationHelper';
import FirebaseHelper from './helpers/FirebaseHelper';
import { routers } from './routes/api';

const app = express();

const mongoDB = 'mongodb://127.0.0.1:27017/tailors';
mongoose.connect(mongoDB, {useNewUrlParser: true});

mongoose.Promise = global.Promise;
const db = mongoose.connection;

db.on('error', () => console.error('MongoDB connection error:'));
db.on('open', () => console.log('MongoDB connection successful!'));

FirebaseHelper.initializeFirebaseApps();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// CORS configuration
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,PATCH,OPTIONS,DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, projectId");
  if(req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use((req, res, next) => {
  if (AuthenticationHelper.tokenExceptionUrl(req.method, req.url)) {
    return next();
  }

  if (!req.headers.authorization || req.headers.authorization.indexOf('Bearer ') === -1) {
    return res.status(403).json({success: false, message: 'Token is required'});
  } else {
    const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
    if(tokenResponse.authSuccess) { 
      return next();
    } else {
      return res.status(403).json({success: false, message: 'Incorrect token', tokenResponse});
    }
  }
});

app.use(async (req, res, next) => {
  try {
    const r = await AuthenticationHelper.projectValidation(req.method, req.url, req.headers.authorization, req.headers.projectid);
    if (typeof r === 'object') req.project = r;
    return next();
  }
  catch (e) {
    return res.status(403).json({success: false, message: 'Permission denied.'});
  } 
});

app.use('/', routers);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;