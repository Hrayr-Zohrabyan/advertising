# advertising API (working name)

This is a universal API on which you can host multiple UBER-ish services

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

What things you need to install the software and how to install them

```
Mongo DB
```
```
Postman
```

### Installing

A step by step series of examples that tell you how to get a development env running

Say what the step will be

```
Clone the project
```
```
npm install
```

For tracking changes with nodemon, use
```
npm run watch
```

or just to start the server
```
npm start
```
```
Mongo should be running
```
```
Test it with postman using postman scenarios.
```
### IMPORTANT

In order for the project to fully work with SMS service and sending letters, you need to add configurations.

We prefer SMS service twilio and 
we prefer the service of sending mail mailtrap
```
Add your configurations ...

config/index.js
config/firebaseKeys/agroport.json
helpers/Mailer.js
helpers/SmsService.js
mailTemplates/activation.hbs
mailTemplates/adminActivation.hbs

or

In the project, look for characters !? and fill the seats
```