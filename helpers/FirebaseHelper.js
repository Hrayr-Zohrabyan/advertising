import * as admin from 'firebase-admin';
import Projects from '../models/projects';

export default class FirebaseHelper {
  static async initializeFirebaseApps() {
    const projects = await Projects.find({active: true});
    for(let project of projects) {
      if(project.projectOptions.firebaseConfig && project.projectOptions.firebaseConfig.certificate) {
        FirebaseHelper.initializeFirebase(project.projectOptions.firebaseConfig, project.name);
      }
    }
  }

  static initializeFirebase(firebaseConfig, projectName) {
    FirebaseHelper.apps[projectName] = admin.initializeApp({
      credential: admin.credential.cert({type: "service_account" ,...firebaseConfig.certificate}),
      databaseURL: firebaseConfig.url
    }, projectName);
  }
  
  static async sendMessage(message, projectName) {
    try {
      await FirebaseHelper.apps[projectName].messaging().send(message);
    } catch (e) {
      console.log(e);
    }
  }

  static apps = {};
}