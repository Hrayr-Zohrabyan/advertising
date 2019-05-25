export default class ProjectionHelper {
  static use(projection, obj) {
    let newObj = {};
    if (obj.toObject) { 
      newObj = obj.toObject(); 
    } else {
      newObj = obj;
    }

    for(let field in projection) {
      if (!projection[field]) newObj[field] = undefined;
    }
    return newObj;
  }
}