const config = {
  secret: 'your secret !?',
  debugMode: 'your debugMode !?',
  debugSmtpCredentials: {
    host: 'your host !?',
    port: 'your port !?',
    auth: {
      user: 'your user !?',
      pass: 'your pass !?'
    }
  },
  smtpCredentials: {},
  twilioAuth: {
    TEST_ACCOUNT_SID: 'your TEST_ACCOUNT_SID !?',
    TEST_AUTH_TOKEN: 'your TEST_AUTH_TOKEN !?',
    LIVE_ACCOUNT_SID: 'your LIVE_ACCOUNT_SID !?',
    LIVE_AUTH_TOKEN: 'your LIVE_AUTH_TOKEN !?',
  }
};

module.exports = config;