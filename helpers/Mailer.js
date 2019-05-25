import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import config from '../config';

export default class Mailer {
  static transporter = null;
  static async sendMail(project, to, subject, template, context) {
    try {
      const account = await nodemailer.createTestAccount();

      if (!Mailer.transporter) {
        Mailer.transporter = nodemailer.createTransport(!config.debugMode ? project.projectOptions.smtpCredentials : config.debugSmtpCredentials);
      }

      Mailer.transporter.use('compile', hbs({
        viewEngine: 'express-handlebars',
        viewPath: './mailTemplates',
        extName: '.hbs'
      }));

      // todo If from windows does not send SMS try this option !

      // Mailer.transporter.use('compile', hbs({
      //   viewEngine: {
      //     extName: '.hbs',
      //     partialsDir: './mailTemplates',
      //     layoutsDir: './mailTemplates',
      //   },
      //   viewPath: './mailTemplates',
      //   extName: '.hbs'
      // }));

      let mailOptions = {
        from: `${project.email} <${project.name}>`,
        to,
        subject,
        template,
        context: {
          ...context,
          signature: project.projectOptions.emailSignature,
          project: project.name,
        },
      };

      await Mailer.transporter.sendMail(mailOptions);
      return true;
    } catch (err) {
      return false;
    }
  }

  static async sendAdminMail(to, subject, template, context) {
    try {
      const account = await nodemailer.createTestAccount();

      if (!Mailer.transporter) {
        Mailer.transporter = nodemailer.createTransport(!config.debugMode ? config.smtpCredentials : config.debugSmtpCredentials);
      }

      Mailer.transporter.use('compile', hbs({
        viewEngine: 'express-handlebars',
        viewPath: './mailTemplates',
        extName: '.hbs'
      }));

      // todo If from windows does not send SMS try this option !
      
      // Mailer.transporter.use('compile', hbs({
      //   viewEngine: {
      //     extName: '.hbs',
      //     partialsDir: './mailTemplates',
      //     layoutsDir: './mailTemplates',
      //   },
      //   viewPath: './mailTemplates',
      //   extName: '.hbs'
      // }));

      let mailOptions = {
        from: 'no-reply@(your project domen !?) <(your project domen !?)>',
        to,
        subject,
        template,
        context: {
          ...context,
          signature: 'With kindest regards',
          project: '(your project domen !?)',
        },
      };

      await Mailer.transporter.sendMail(mailOptions);
      return true;
    } catch (err) {
      return false;
    }
  }
}