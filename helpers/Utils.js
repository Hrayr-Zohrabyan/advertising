export default class Utils {
  static smallerString(str1, str2) {
    if (str1.length != str2.length) return false;
    for(let i = 0; i<str1.length; i++) {
      if(str1.charCodeAt(i) < str2.charCodeAt(i)) {
        return str1;
      } else if (str1.charCodeAt(i) > str2.charCodeAt(i)) {
        return str2;
      } 
    }
    return false;
  }
  static largerString(str1, str2) {
    if (str1.length != str2.length) return false;
    for(let i = 0; i<str1.length; i++) {
      if(str1.charCodeAt(i) > str2.charCodeAt(i)) {
        return str1;
      } else if (str1.charCodeAt(i) < str2.charCodeAt(i)) {
        return str2;
      } 
    }
    return false;
  }
}
