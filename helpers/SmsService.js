import config from '../config';
const client = require('twilio')(config.twilioAuth.LIVE_ACCOUNT_SID, config.twilioAuth.LIVE_AUTH_TOKEN);

export default class SmsService {
  static async PhoneVerification(phoneNumber, activationCode) {
    try {
      client.messages.create({
        to: phoneNumber,
        from: 'mailer number !?',
        body: `Your activation code is ${activationCode}`,
      });
    } catch (e) {
      console.log(e);
    }
  }
}